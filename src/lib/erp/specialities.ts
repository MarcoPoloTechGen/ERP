import { supabase } from "@/lib/supabase";

export type Speciality = {
  id: number;
  name: string;
};

export type WorkerSpeciality = {
  specialityId: number;
  name: string;
};

type WorkerSpecialityRow = {
  speciality_id: number | null;
  specialities?: { name?: string | null } | { name?: string | null }[] | null;
};

function readSpecialityName(value: WorkerSpecialityRow["specialities"]) {
  if (Array.isArray(value)) {
    return value[0]?.name?.trim() ?? "";
  }

  return value?.name?.trim() ?? "";
}

function uniqueFiniteIds(ids: number[]) {
  return Array.from(new Set(ids.filter((id) => Number.isFinite(id))));
}

export async function listSpecialities(): Promise<Speciality[]> {
  const { data, error } = await supabase
    .from("specialities")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? [])
    .map((row) => ({
      id: Number(row.id),
      name: row.name.trim(),
    }))
    .filter((speciality) => Number.isFinite(speciality.id) && speciality.name.length > 0);
}

export async function getWorkerSpecialities(workerId: number): Promise<WorkerSpeciality[]> {
  const { data, error } = await supabase
    .from("worker_specialities")
    .select("speciality_id, specialities(name)")
    .eq("worker_id", workerId)
    .order("speciality_id", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as WorkerSpecialityRow[])
    .map((row) => ({
      specialityId: Number(row.speciality_id),
      name: readSpecialityName(row.specialities),
    }))
    .filter((speciality) => Number.isFinite(speciality.specialityId));
}

export async function createWorkerSpeciality(payload: { workerId: number; specialityId: number }) {
  const { error } = await supabase.from("worker_specialities").insert({
    worker_id: payload.workerId,
    speciality_id: payload.specialityId,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteWorkerSpeciality(workerId: number, specialityId: number) {
  const { error } = await supabase
    .from("worker_specialities")
    .delete()
    .eq("worker_id", workerId)
    .eq("speciality_id", specialityId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateWorkerSpecialities(workerId: number, specialityIds: number[]) {
  const selectedIds = uniqueFiniteIds(specialityIds);
  const { error: deleteError } = await supabase
    .from("worker_specialities")
    .delete()
    .eq("worker_id", workerId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  if (!selectedIds.length) {
    return;
  }

  const { error: insertError } = await supabase.from("worker_specialities").insert(
    selectedIds.map((specialityId) => ({
      worker_id: workerId,
      speciality_id: specialityId,
    })),
  );

  if (insertError) {
    throw new Error(insertError.message);
  }
}
