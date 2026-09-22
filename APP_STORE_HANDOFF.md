# Jambit iOS App Store Handoff

This archive contains the iOS-ready React Native source. It is not an IPA and cannot be uploaded directly to App Store Connect.

## Payment behavior

- In-person paid event tickets use the real Razorpay checkout and are verified by the Jambit backend before a ticket is issued.
- `IOS_RAZORPAY_PAYMENTS_ENABLED=true` is configured on the production backend.
- When that server flag is `false`, the iOS app marks paid booking unavailable. It does not create an order, ticket, or transaction ID.
- Android and web payment availability are not affected by the iOS flag.

## Build on macOS

1. Install Node.js 22+, Ruby/Bundler, CocoaPods, and the current stable Xcode.
2. Run `npm ci` from the project root.
3. Run `bundle install` if Bundler is being used for CocoaPods.
4. Run `cd ios && bundle exec pod install` or `pod install`.
5. Open `ios/Jambit.xcworkspace` in Xcode. Do not archive the `.xcodeproj` directly after installing pods.
6. Select the `Jambit` target and the Apple development team.
7. Confirm the bundle identifier is `com.jambit` and that Push Notifications is enabled.
8. Select `Any iOS Device (arm64)`, then use Product > Archive.
9. In Organizer, run Validate App and then Distribute App > App Store Connect > Upload.

## App Review notes

Explain that Jambit uses Razorpay to sell tickets for in-person events that are consumed outside the app. Do not describe the payment as an Apple in-app purchase. Paid one-to-many online events must remain unavailable on iOS unless StoreKit in-app purchase is implemented for them.

The production API is `https://jambit.in/api`. No backend credentials or Apple signing keys are included in this archive.
