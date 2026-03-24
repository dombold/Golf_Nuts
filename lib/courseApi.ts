/**
 * Golf Course API client.
 * API key is stored in GOLF_COURSE_API_KEY env variable.
 * Courses are fetched on import only — results saved to PostgreSQL.
 */

const BASE_URL = process.env.GOLF_COURSE_API_BASE_URL ?? "https://api.golfcourseapi.com/v1";
const API_KEY = process.env.GOLF_COURSE_API_KEY ?? "";

export interface ApiCourse {
  id: string;
  club_name: string;
  course_name?: string;
  location?: {
    address?: string;
    city?: string;
    state?: string;
    country?: string;
  };
  tees?: { male?: ApiTee[]; female?: ApiTee[] } | ApiTee[];
}

export interface ApiTee {
  tee_name: string;
  tee_color?: string;
  course_rating: number;
  slope_rating: number;
  par_total: number;
  holes?: ApiHole[];
}

export interface ApiHole {
  par: number;
  handicap?: number;
  yardage?: number;
}

async function apiFetch<T>(path: string): Promise<T> {
  if (!API_KEY) {
    throw new Error(
      "GOLF_COURSE_API_KEY is not set. Add your subscription key to .env"
    );
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      Authorization: `Key ${API_KEY}`,
      "Content-Type": "application/json",
    },
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    throw new Error(`Golf Course API error: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function searchCourses(query: string): Promise<ApiCourse[]> {
  const encoded = encodeURIComponent(query);
  const data = await apiFetch<{ courses: ApiCourse[] }>(
    `/courses?club_name=${encoded}`
  );
  return data.courses ?? [];
}

export async function getCourseById(externalId: string): Promise<ApiCourse> {
  const data = await apiFetch<{ course: ApiCourse }>(`/courses/${externalId}`);
  return data.course;
}

export function flattenTees(tees: ApiCourse["tees"]): ApiTee[] {
  if (!tees) return [];
  if (Array.isArray(tees)) return tees;
  const tag = (group: ApiTee[], suffix: string) =>
    group.map((t) => ({ ...t, tee_name: `${t.tee_name} (${suffix})` }));
  return [...tag(tees.male ?? [], "Male"), ...tag(tees.female ?? [], "Female")];
}
