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

type WorkerSpecialitiesByWorkerRow = WorkerSpecialityRow & {
  worker_id: number | null;
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

export async function createSpeciality(name: string) {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error("Speciality name is required.");
  }

  const { error } = await supabase.from("specialities").insert({ name: trimmedName });

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateSpeciality(id: number, name: string) {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error("Speciality name is required.");
  }

  const { error } = await supabase.from("specialities").update({ name: trimmedName }).eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteSpeciality(id: number) {
  const { error } = await supabase.from("specialities").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
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

export async function listWorkerSpecialitiesByWorker(workerIds: number[]): Promise<Record<number, WorkerSpeciality[]>> {
  const selectedWorkerIds = uniqueFiniteIds(workerIds);

  if (!selectedWorkerIds.length) {
    return {};
  }

  const { data, error } = await supabase
    .from("worker_specialities")
    .select("worker_id, speciality_id, specialities(name)")
    .in("worker_id", selectedWorkerIds)
    .order("worker_id", { ascending: true })
    .order("speciality_id", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const specialitiesByWorker: Record<number, WorkerSpeciality[]> = Object.fromEntries(
    selectedWorkerIds.map((workerId) => [workerId, []]),
  );

  for (const row of (data ?? []) as WorkerSpecialitiesByWorkerRow[]) {
    const workerId = Number(row.worker_id);
    const specialityId = Number(row.speciality_id);

    if (!Number.isFinite(workerId) || !Number.isFinite(specialityId)) {
      continue;
    }

    specialitiesByWorker[workerId] ??= [];
    specialitiesByWorker[workerId].push({
      specialityId,
      name: readSpecialityName(row.specialities),
    });
  }

  return specialitiesByWorker;
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
