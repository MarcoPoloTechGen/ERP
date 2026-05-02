import { useMutation, useQuery } from "@tanstack/react-query";
import { App } from "antd";
import { erpKeys, createWorkerSpeciality, deleteWorkerSpeciality, getWorkerSpecialities, listSpecialities, updateWorkerSpecialities } from "@/lib/erp";
import { toErrorMessage } from "@/lib/refine-helpers";
import { useErpInvalidation } from "@/hooks/use-erp-invalidation";
import { useLang } from "@/lib/i18n";

export function useListSpecialities() {
  return useQuery({
    queryKey: erpKeys.specialities,
    queryFn: listSpecialities,
  });
}

export function useWorkerSpecialities(workerId: number) {
  const { t } = useLang();
  const { message } = App.useApp();
  const erpInvalidation = useErpInvalidation();

  const { data: specialities = [], isLoading } = useQuery({
    queryKey: erpKeys.workerSpecialities(workerId),
    queryFn: () => getWorkerSpecialities(workerId),
    enabled: Number.isFinite(workerId),
  });

  const updateMutation = useMutation({
    mutationFn: (specialityIds: number[]) => updateWorkerSpecialities(workerId, specialityIds),
    onSuccess: async () => {
      await erpInvalidation.workerSpecialities(workerId);
      message.success(t.saved);
    },
    onError: (error) => void message.error(toErrorMessage(error)),
  });

  return {
    specialities,
    isLoading,
    updateSpecialities: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
}
