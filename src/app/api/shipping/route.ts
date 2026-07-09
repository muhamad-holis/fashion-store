import { NextRequest, NextResponse } from "next/server";
import { getShippingOptions } from "@/lib/shipping";

export async function POST(request: NextRequest) {
  const { destinationCity, totalWeightGrams } = await request.json();

  if (!destinationCity || !totalWeightGrams) {
    return NextResponse.json(
      { error: "destinationCity dan totalWeightGrams wajib diisi" },
      { status: 400 }
    );
  }

  const options = await getShippingOptions({ destinationCity, totalWeightGrams });
  return NextResponse.json({ options });
}
