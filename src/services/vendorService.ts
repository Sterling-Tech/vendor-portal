import { get } from "./api";

export interface VendorOnboardingData{
  id: number;
  business_name: string;
  email: string;
  phone_number: string;
  account_status: "active";
  hierachy: "vendor"|"sub-vendor"|"agent"|"cashier"|"pos";
  vendor_type: "internal"|"external";
  related_vendor: {
    id: number;
    email: string;
    business_name: string;
    account_status: "active"|"inactive"|"suspended";
    hierachy: "vendor"|"sub-vendor"|"agent"|"cashier"|"pos";
    vendor_type: "internal"|"external";
  },
  funding_cap: string;
  transaction_max: string;
  commission_rate: string;
  monthly_target: string;
  onboarding_status: string;
  kyc_submitted_at: string;
  kyc_reviewed_at: string;
  kyc_rejection_reason: string;
  token: string;
  test_token: string;
  test_token_expires_at: string;
  test_balance: string;
}
export const fetchVendorOnboardingData = async (): Promise<VendorOnboardingData> => {
  const response = await get<VendorOnboardingData>("/vendor/onboarding/");
  return response;
}
