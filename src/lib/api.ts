import { NextResponse } from "next/server";
import { ACTIONS_HEADERS } from "./actions";

/** Error carrying an HTTP status code, thrown by domain helpers. */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function json<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function fail(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  const message = error instanceof Error ? error.message : "Unexpected error";
  return NextResponse.json({ error: message }, { status: 500 });
}

/** Attach the CORS + Action version headers required by Blinks clients. */
export function withActionsHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(ACTIONS_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}
