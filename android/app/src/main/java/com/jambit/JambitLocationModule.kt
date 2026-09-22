package com.jambit

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.location.Address
import android.location.Geocoder
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.util.Locale

class JambitLocationModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "JambitLocation"

  @ReactMethod
  fun openLocationSettings(promise: Promise) {
    try {
      val intent = Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      reactContext.startActivity(intent)
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("LOCATION_SETTINGS_UNAVAILABLE", error.message, error)
    }
  }

  @ReactMethod
  fun getCurrentLocation(promise: Promise) {
    if (!hasLocationPermission()) {
      promise.reject("LOCATION_PERMISSION_DENIED", "Location permission is required.")
      return
    }

    val locationManager = reactContext.getSystemService(Context.LOCATION_SERVICE) as LocationManager
    val providers = listOf(LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER)
      .filter { provider ->
        try {
          locationManager.isProviderEnabled(provider)
        } catch (_: Exception) {
          false
        }
      }

    if (providers.isEmpty()) {
      promise.reject("LOCATION_UNAVAILABLE", "Location services are disabled.")
      return
    }

    val lastLocation = providers
      .mapNotNull { provider -> runCatching { locationManager.getLastKnownLocation(provider) }.getOrNull() }
      .maxByOrNull { location -> location.time }

    if (lastLocation != null) {
      resolveLocation(lastLocation, promise)
      return
    }

    val handler = Handler(Looper.getMainLooper())
    var resolved = false
    val listener = object : LocationListener {
      override fun onLocationChanged(location: Location) {
        if (resolved) return
        resolved = true
        handler.removeCallbacksAndMessages(null)
        locationManager.removeUpdates(this)
        resolveLocation(location, promise)
      }

      override fun onProviderDisabled(provider: String) = Unit
      override fun onProviderEnabled(provider: String) = Unit
      override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) = Unit
    }

    try {
      locationManager.requestSingleUpdate(providers.first(), listener, Looper.getMainLooper())
      handler.postDelayed({
        if (!resolved) {
          resolved = true
          locationManager.removeUpdates(listener)
          promise.reject("LOCATION_TIMEOUT", "Location request timed out.")
        }
      }, 12000)
    } catch (error: SecurityException) {
      promise.reject("LOCATION_PERMISSION_DENIED", error.message, error)
    } catch (error: Exception) {
      promise.reject("LOCATION_UNAVAILABLE", error.message, error)
    }
  }

  private fun hasLocationPermission(): Boolean {
    val coarseGranted = ContextCompat.checkSelfPermission(
      reactContext,
      Manifest.permission.ACCESS_COARSE_LOCATION,
    ) == PackageManager.PERMISSION_GRANTED
    val fineGranted = ContextCompat.checkSelfPermission(
      reactContext,
      Manifest.permission.ACCESS_FINE_LOCATION,
    ) == PackageManager.PERMISSION_GRANTED

    return coarseGranted || fineGranted
  }

  private fun resolveLocation(location: Location, promise: Promise) {
    val map = Arguments.createMap()
    map.putDouble("latitude", location.latitude)
    map.putDouble("longitude", location.longitude)

    val address = reverseGeocode(location)
    map.putString("city", address?.locality ?: address?.subAdminArea ?: address?.adminArea)
    map.putString("description", buildDescription(address, location))
    promise.resolve(map)
  }

  private fun reverseGeocode(location: Location): Address? {
    return try {
      val geocoder = Geocoder(reactContext, Locale.getDefault())
      @Suppress("DEPRECATION")
      geocoder.getFromLocation(location.latitude, location.longitude, 1)?.firstOrNull()
    } catch (_: Exception) {
      null
    }
  }

  private fun buildDescription(address: Address?, location: Location): String {
    if (address == null) {
      return "${"%.5f".format(Locale.US, location.latitude)}, ${"%.5f".format(Locale.US, location.longitude)}"
    }

    val parts = listOf(
      address.subLocality,
      address.locality,
      address.adminArea,
      address.countryName,
    )
      .filterNotNull()
      .map { part -> part.trim() }
      .filter { part -> part.isNotEmpty() }
      .distinct()

    return parts.joinToString(", ").ifBlank {
      "${"%.5f".format(Locale.US, location.latitude)}, ${"%.5f".format(Locale.US, location.longitude)}"
    }
  }
}
