declare module 'react-native-razorpay' {
  export type RazorpaySuccess = {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  };

  export type RazorpayFailure = {
    code?: number | string;
    description?: string;
    reason?: string;
  };

  export type RazorpayOptions = {
    key: string;
    amount: number;
    currency: string;
    name: string;
    description?: string;
    order_id: string;
    prefill?: {
      name?: string;
      email?: string;
      contact?: string;
    };
    theme?: { color?: string };
    retry?: { enabled: boolean; max_count?: number };
  };

  export default class RazorpayCheckout {
    static open(options: RazorpayOptions): Promise<RazorpaySuccess>;
  }
}
