import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App, Button, Card, Empty, List, Popconfirm, Space, Tooltip, Typography, Upload } from "antd";
import { Download, File, Trash2, UploadCloud } from "lucide-react";
import {
  attachProjectFile,
  deleteProjectFile,
  erpKeys,
  getProjectFileDownloadUrl,
  type ProjectFile,
} from "@/lib/erp";
import { formatDate } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import { hasAdminAccess } from "@/lib/permissions";
import { toErrorMessage } from "@/lib/refine-helpers";
import { useProjectFiles } from "@/hooks/use-projects";
import { useAuth } from "@/lib/auth";

function formatFileSize(size: number) {
  if (!Number.isFinite(size) || size <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  const unitIndex = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
  const value = size / 1024 ** unitIndex;

  return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
}

export function ProjectFilesCard({ projectId }: { projectId: number }) {
  const { t } = useLang();
  const { profile } = useAuth();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const filesQuery = useProjectFiles(projectId);
  const [downloadingFileId, setDownloadingFileId] = useState<number | null>(null);
  const canManageAllFiles = hasAdminAccess(profile?.role);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => attachProjectFile(projectId, file),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: erpKeys.projectFiles(projectId) });
      message.success(t.fileUploaded);
    },
    onError: (error) => void message.error(toErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: (file: ProjectFile) => deleteProjectFile(file),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: erpKeys.projectFiles(projectId) });
      message.success(t.fileDeleted);
    },
    onError: (error) => void message.error(toErrorMessage(error)),
  });

  async function downloadFile(file: ProjectFile) {
    try {
      setDownloadingFileId(file.id);
      const signedUrl = await getProjectFileDownloadUrl(file);
      if (!signedUrl) {
        throw new Error(t.notFound);
      }

      window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      message.error(toErrorMessage(error));
    } finally {
      setDownloadingFileId(null);
    }
  }

  const files = filesQuery.data ?? [];

  return (
    <Card
      title={t.projectFiles}
      extra={
        <Upload
          showUploadList={false}
          beforeUpload={(file) => {
            uploadMutation.mutate(file);
            return false;
          }}
        >
          <Button icon={<UploadCloud size={16} />} loading={uploadMutation.isPending}>
            {t.uploadProjectFile}
          </Button>
        </Upload>
      }
    >
      {!files.length && !filesQuery.isLoading ? (
        <Empty description={t.noProjectFiles} />
      ) : (
        <List
          loading={filesQuery.isLoading}
          dataSource={files}
          renderItem={(file) => {
            const canDeleteFile = canManageAllFiles || file.uploadedBy === profile?.id;

            return (
              <List.Item
                actions={[
                  <Tooltip key="download" title={t.downloadFile}>
                    <Button
                      icon={<Download size={16} />}
                      loading={downloadingFileId === file.id}
                      onClick={() => void downloadFile(file)}
                    />
                  </Tooltip>,
                  canDeleteFile ? (
                    <Popconfirm
                      key="delete"
                      title={t.deleteFileConfirm}
                      okText={t.remove}
                      cancelText={t.cancel}
                      onConfirm={() => deleteMutation.mutate(file)}
                    >
                      <Tooltip title={t.remove}>
                        <Button
                          danger
                          icon={<Trash2 size={16} />}
                          loading={deleteMutation.isPending && deleteMutation.variables?.id === file.id}
                        />
                      </Tooltip>
                    </Popconfirm>
                  ) : null,
                ].filter(Boolean)}
              >
                <List.Item.Meta
                  avatar={<File size={20} />}
                  title={<Typography.Text strong>{file.fileName}</Typography.Text>}
                  description={
                    <Space size="small" wrap>
                      <Typography.Text type="secondary">{formatFileSize(file.fileSize)}</Typography.Text>
                      <Typography.Text type="secondary">{formatDate(file.createdAt)}</Typography.Text>
                    </Space>
                  }
                />
              </List.Item>
            );
          }}
        />
      )}
    </Card>
  );
}
