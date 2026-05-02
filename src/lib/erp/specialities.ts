import {
  insertWorkerSpecialitySchema,
  listSpecialitiesSchema,
  updateWorkerSpecialitySchema,
} from "@/lib/validation";
import { supabase } from "@/lib/supabase";
import type { DbResult, DbResultOk } from "@/lib/database.types";

export async function listSpecialities() {
  const result = await supabase.from("specialities").select("id, name").throwOnError();
  return listSpecialitiesSchema.parse(result.data);
}

export async function getWorkerSpecialities(workerId: number) {
  const result = await supabase
    .from("worker_specialities")
    .select("speciality_id, specialities(name)")
    .eq("worker_id", workerId)
    .throwOnError();
  
  return result.data?.map((ws) => ({
    specialityId: ws.speciality_id,
    name: ws.specialities?.name || '',
  })) || [];
}

export async function createWorkerSpeciality(
  payload: {
    workerId: number;
    specialityId: number;
  },
) {
  const parsedPayload = insertWorkerSpecialitySchema.parse(payload);
  const result = await supabase.from("worker_specialities").insert(parsedPayload).throwOnError().select();
  return result.data?.[0];
}

export async function deleteWorkerSpeciality(workerId: number, specialityId: number) {
  const result = await supabase
    .from("worker_specialities")
    .delete()
    .eq("worker_id", workerId)
    .eq("speciality_id", specialityId)
    .throwOnError();
  return result.data;
}

export async function updateWorkerSpecialities(workerId: number, specialityIds: number[]) {
  const { data: existingSpecialities } = await supabase
    .from("worker_specialities")
    .select("speciality_id")
    .eq("worker_id", workerId);

  const existingSpecialityIds = existingSpecialities?.map((s) => s.speciality_id) || [];

  const specialitiesToAdd = specialityIds.filter(
    (id) => !existingSpecialityIds.includes(id)
  );
  const specialitiesToRemove = existingSpecialityIds.filter(
    (id) => !specialityIds.includes(id)
  );

  const addPromises = specialitiesToAdd.map((specialityId) =>
    createWorkerSpeciality({ workerId, specialityId })
  );
  const removePromises = specialitiesToRemove.map((specialityId) =>
    deleteWorkerSpeciality(workerId, specialityId)
  );

  await Promise.all([...addPromises, ...removePromises]);
}

export type Speciality = Awaited<DbResultOk<typeof listSpecialities>>[number];
export type WorkerSpeciality = Awaited<ReturnType<typeof getWorkerSpecialities>>[number];