import { defineRouteConfig } from "@medusajs/admin-sdk";
import { DocumentText, ArrowDownTray } from "@medusajs/icons";
import {
    Container,
    Heading,
    Button,
    Text,
    Badge,
    toast,
    Toaster,
    Input,
    Textarea,
    Label,
} from "@medusajs/ui";
import { useState, useEffect, useCallback } from "react";

type RagDocument = {
    id: string;
    filename: string;
    mime_type: string;
    status: "pending" | "processing" | "completed" | "failed";
    error_message?: string;
    created_at: string;
    updated_at: string;
};

const RagDocumentsPage = () => {
    const [documents, setDocuments] = useState<RagDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [uploadingText, setUploadingText] = useState(false);
    const [downloadingAll, setDownloadingAll] = useState(false);

    // Text input state
    const [textTitle, setTextTitle] = useState("");
    const [textContent, setTextContent] = useState("");
    const [showTextForm, setShowTextForm] = useState(false);

    const fetchDocuments = useCallback(async () => {
        try {
            const response = await fetch("/admin/rag/documents", {
                credentials: "include",
            });
            const data = await response.json();
            setDocuments(data.documents || []);
        } catch (error) {
            toast.error("Încărcarea documentelor a eșuat");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    const handleFileUpload = async (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploading(true);

        try {
            // Get signed upload URL
            const urlResponse = await fetch("/admin/rag/upload-url", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    filename: file.name,
                    mime_type: file.type,
                }),
            });

            if (!urlResponse.ok) {
                const error = await urlResponse.json();
                throw new Error(error.error || "Failed to get upload URL");
            }

            const { signed_url, storage_key } = await urlResponse.json();

            // Upload file to Supabase Storage
            const uploadResponse = await fetch(signed_url, {
                method: "PUT",
                headers: { "Content-Type": file.type },
                body: file,
            });

            if (!uploadResponse.ok) {
                throw new Error("Failed to upload file");
            }

            // Create document record and trigger ingestion
            const createResponse = await fetch("/admin/rag/documents", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    filename: file.name,
                    storage_key,
                    mime_type: file.type,
                }),
            });

            if (!createResponse.ok) {
                const error = await createResponse.json();
                throw new Error(error.error || "Failed to create document");
            }

            toast.success("Documentul a fost încărcat și procesat cu succes");
            fetchDocuments();
        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : "Încărcarea a eșuat"
            );
        } finally {
            setUploading(false);
            event.target.value = "";
        }
    };

    const handleTextUpload = async () => {
        if (!textTitle.trim() || !textContent.trim()) {
            toast.error("Te rugăm să completezi atât titlul cât și conținutul");
            return;
        }

        setUploadingText(true);

        try {
            const response = await fetch("/admin/rag/text", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    title: textTitle.trim(),
                    content: textContent.trim(),
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to upload text");
            }

            toast.success("Textul a fost încărcat și procesat cu succes");
            setTextTitle("");
            setTextContent("");
            setShowTextForm(false);
            fetchDocuments();
        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : "Încărcarea textului a eșuat"
            );
        } finally {
            setUploadingText(false);
        }
    };

    const handleDownload = async (id: string, filename: string) => {
        try {
            const response = await fetch(`/admin/rag/documents/${id}/download`, {
                credentials: "include",
            });

            if (!response.ok) {
                throw new Error("Obținerea URL-ului de descărcare a eșuat");
            }

            const { download_url } = await response.json();

            // Open download URL in new tab
            const link = document.createElement("a");
            link.href = download_url;
            link.download = filename;
            link.target = "_blank";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            toast.error("Descărcarea documentului a eșuat");
        }
    };

    const handleDownloadAll = async () => {
        if (documents.length === 0) {
            toast.error("Nu există documente de descărcat");
            return;
        }

        setDownloadingAll(true);

        try {
            const response = await fetch("/admin/rag/documents/download-all", {
                credentials: "include",
            });

            if (!response.ok) {
                throw new Error("Descărcarea arhivei a eșuat");
            }

            // Get the blob and trigger download
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `knowledge-base-${new Date().toISOString().split("T")[0]}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            toast.success("Arhiva a fost descărcată cu succes");
        } catch (error) {
            toast.error("Descărcarea arhivei a eșuat");
        } finally {
            setDownloadingAll(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Ești sigur că vrei să ștergi acest document?")) return;

        try {
            const response = await fetch(`/admin/rag/documents/${id}`, {
                method: "DELETE",
                credentials: "include",
            });

            if (!response.ok) {
                throw new Error("Ștergerea documentului a eșuat");
            }

            toast.success("Documentul a fost șters");
            fetchDocuments();
        } catch (error) {
            toast.error("Ștergerea documentului a eșuat");
        }
    };

    const handleReIngest = async (id: string) => {
        try {
            const response = await fetch(`/admin/rag/documents/${id}`, {
                method: "POST",
                credentials: "include",
            });

            if (!response.ok) {
                throw new Error("Re-procesarea documentului a eșuat");
            }

            toast.success("Documentul a fost re-procesat cu succes");
            fetchDocuments();
        } catch (error) {
            toast.error("Re-procesarea documentului a eșuat");
        }
    };

    const getStatusBadge = (status: RagDocument["status"]) => {
        const colors: Record<
            RagDocument["status"],
            "green" | "orange" | "red" | "grey"
        > = {
            completed: "green",
            processing: "orange",
            failed: "red",
            pending: "grey",
        };
        return <Badge color={colors[status]}>{status}</Badge>;
    };

    return (
        <Container>
            <Toaster />

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <Heading level="h1">Documente bază de cunoștințe</Heading>
                    <Text className="text-ui-fg-subtle mt-1">
                        Încarcă PDF-uri, fișiere text sau introdu text direct pentru a
                        alimenta baza de cunoștințe a chatbot-ului
                    </Text>
                    <Badge color="blue" className="mt-2">
                        Doar organizațional
                    </Badge>
                </div>
                <div className="flex gap-2">
                    {documents.length > 0 && (
                        <Button
                            variant="secondary"
                            disabled={downloadingAll}
                            onClick={handleDownloadAll}
                        >
                            <ArrowDownTray className="w-4 h-4 mr-2" />
                            {downloadingAll ? "Se descarcă..." : "Descarcă tot"}
                        </Button>
                    )}
                    <Button
                        variant="secondary"
                        onClick={() => setShowTextForm(!showTextForm)}
                    >
                        {showTextForm ? "Anulează" : "Adaugă text"}
                    </Button>
                    <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        accept=".pdf,.txt,.md,.csv"
                        onChange={handleFileUpload}
                        disabled={uploading}
                    />
                    <Button
                        variant="primary"
                        disabled={uploading}
                        onClick={() =>
                            document.getElementById("file-upload")?.click()
                        }
                    >
                        {uploading ? "Se încarcă..." : "Încarcă fișier"}
                    </Button>
                </div>
            </div>

            {/* Text Input Form */}
            {showTextForm && (
                <div className="mb-6 p-4 border border-ui-border-base rounded-lg bg-ui-bg-subtle">
                    <Heading level="h2" className="mb-4">
                        Adaugă conținut text
                    </Heading>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="text-title">Titlu</Label>
                            <Input
                                id="text-title"
                                placeholder="ex., Politica de livrare"
                                value={textTitle}
                                onChange={(e) => setTextTitle(e.target.value)}
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label htmlFor="text-content">Conținut</Label>
                            <Textarea
                                id="text-content"
                                placeholder="Introdu conținutul bazei de cunoștințe aici..."
                                value={textContent}
                                onChange={(e) => setTextContent(e.target.value)}
                                rows={6}
                                className="mt-1"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="primary"
                                disabled={uploadingText}
                                onClick={handleTextUpload}
                            >
                                {uploadingText ? "Se încarcă..." : "Încarcă text"}
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    setShowTextForm(false);
                                    setTextTitle("");
                                    setTextContent("");
                                }}
                            >
                                Anulează
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Documents List */}
            {loading ? (
                <Text>Se încarcă documentele...</Text>
            ) : documents.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-ui-border-base rounded-lg">
                    <DocumentText className="w-12 h-12 mx-auto text-ui-fg-muted mb-4" />
                    <Text className="text-ui-fg-subtle">
                        Nu există documente încărcate. Încarcă un fișier sau adaugă
                        text pentru a începe.
                    </Text>
                </div>
            ) : (
                <div className="border border-ui-border-base rounded-lg overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-ui-bg-subtle">
                            <tr>
                                <th className="text-left px-4 py-3 text-ui-fg-subtle font-medium">
                                    Nume fișier
                                </th>
                                <th className="text-left px-4 py-3 text-ui-fg-subtle font-medium">
                                    Tip
                                </th>
                                <th className="text-left px-4 py-3 text-ui-fg-subtle font-medium">
                                    Status
                                </th>
                                <th className="text-left px-4 py-3 text-ui-fg-subtle font-medium">
                                    Încărcat
                                </th>
                                <th className="text-right px-4 py-3 text-ui-fg-subtle font-medium">
                                    Acțiuni
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {documents.map((doc) => (
                                <tr
                                    key={doc.id}
                                    className="border-t border-ui-border-base"
                                >
                                    <td className="px-4 py-3">
                                        <Text className="font-medium">
                                            {doc.filename}
                                        </Text>
                                        {doc.error_message && (
                                            <Text className="text-ui-fg-error text-sm">
                                                {doc.error_message}
                                            </Text>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <Text className="text-ui-fg-subtle">
                                            {doc.mime_type}
                                        </Text>
                                    </td>
                                    <td className="px-4 py-3">
                                        {getStatusBadge(doc.status)}
                                    </td>
                                    <td className="px-4 py-3">
                                        <Text className="text-ui-fg-subtle">
                                            {new Date(
                                                doc.created_at
                                            ).toLocaleDateString()}
                                        </Text>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex gap-2 justify-end">
                                            <Button
                                                variant="secondary"
                                                size="small"
                                                onClick={() =>
                                                    handleDownload(
                                                        doc.id,
                                                        doc.filename
                                                    )
                                                }
                                            >
                                                Descarcă
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                size="small"
                                                onClick={() =>
                                                    handleReIngest(doc.id)
                                                }
                                            >
                                                Re-procesează
                                            </Button>
                                            <Button
                                                variant="danger"
                                                size="small"
                                                onClick={() =>
                                                    handleDelete(doc.id)
                                                }
                                            >
                                                Șterge
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </Container>
    );
};

export const config = defineRouteConfig({
    label: "Bază de cunoștințe",
    icon: DocumentText,
});

export default RagDocumentsPage;
