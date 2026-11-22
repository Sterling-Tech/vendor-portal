import { get } from "./api";


export interface VendorRecord {
  id: number;
  business_name: string;
  email: string;
  phone_number: string;
  account_status: "active" | "inactive" | "suspended";
  hierachy: string;
  vendor_type: "internal" | "external";
  token: string | null;
  test_token: string | null;
  test_token_expires_at: string | null;
  test_balance: string | null;
}

export interface VendorRetrieveResponse {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results?: VendorRecord[];
}

export const fetchVendorById = async (
  vendorId: number
): Promise<VendorRecord> => {
  const response = await get<
    VendorRecord | VendorRecord[] | VendorRetrieveResponse
  >(`/vendor/retrieve/?vendor_id=${vendorId}`);

  // Support the different response shapes described by the API.
  if (Array.isArray(response)) {
    if (!response.length) throw new Error("Vendor record not found.");
    return response[0];
  }

  if ("results" in response && response.results) {
    if (!response.results.length) throw new Error("Vendor record not found.");
    return response.results[0];
  }

  return response as VendorRecord;
};