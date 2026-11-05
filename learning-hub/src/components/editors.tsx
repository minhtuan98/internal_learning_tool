"use client";

import { useEffect, useRef, useState } from "react";
import { App, Button, Divider, Flex, Tooltip, Typography, Upload } from "antd";
import {
  BoldOutlined,
  ItalicOutlined,
  LinkOutlined,
  OrderedListOutlined,
  PictureOutlined,
  UnorderedListOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import LinkExt from "@tiptap/extension-link";

const ACCEPT = "image/jpeg,image/png,image/webp";

async function uploadImage(file: File): Promise<{ ok: true; url: string; name: string } | { ok: false; error: string }> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  return res.json();
}

/** Rich-text article editor with inline images (DEC-047, DEC-053). */
export function RichTextEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const { message } = App.useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit.configure({ heading: { levels: [2, 3] } }), Image, LinkExt.configure({ openOnClick: false })],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !editor) return;
    const r = await uploadImage(file);
    if (!r.ok) return void message.error(r.error);
    editor.chain().focus().setImage({ src: r.url, alt: file.name }).run();
  };

  const setLink = () => {
    if (!editor) return;
    const url = window.prompt("Dán đường dẫn (https://...)", editor.getAttributes("link").href ?? "");
    if (url === null) return;
    if (url === "") editor.chain().focus().unsetLink().run();
    else editor.chain().focus().setLink({ href: url }).run();
  };

  const btn = (title: string, icon: React.ReactNode, active: boolean, run: () => void) => (
    <Tooltip title={title}>
      <Button size="small" type={active ? "primary" : "text"} icon={icon} onClick={run} />
    </Tooltip>
  );

  return (
    <div className="lh-editor" style={{ border: "1px solid var(--lh-border)", borderRadius: 8, background: "var(--lh-surface)" }}>
      <Flex gap={4} align="center" style={{ padding: 8, borderBottom: "1px solid var(--lh-border)" }} wrap>
        {editor && (
          <>
            {btn("In đậm", <BoldOutlined />, editor.isActive("bold"), () => editor.chain().focus().toggleBold().run())}
            {btn("In nghiêng", <ItalicOutlined />, editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run())}
            <Divider orientation="vertical" />
            <Button size="small" type={editor.isActive("heading", { level: 2 }) ? "primary" : "text"} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</Button>
            <Button size="small" type={editor.isActive("heading", { level: 3 }) ? "primary" : "text"} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</Button>
            {btn("Danh sách", <UnorderedListOutlined />, editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run())}
            {btn("Danh sách đánh số", <OrderedListOutlined />, editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run())}
            <Divider orientation="vertical" />
            {btn("Chèn liên kết", <LinkOutlined />, editor.isActive("link"), setLink)}
            {btn("Chèn ảnh (JPG, PNG, WebP, tối đa 2 MB)", <PictureOutlined />, false, () => fileRef.current?.click())}
            <input ref={fileRef} type="file" accept={ACCEPT} hidden onChange={onPick} />
          </>
        )}
      </Flex>
      <EditorContent editor={editor} className="lh-article" />
    </div>
  );
}

/** Cover image upload: JPG, PNG or WebP up to 2 MB (DEC-039, DEC-045). */
export function CoverUpload({ value, onChange }: { value?: string; onChange?: (name: string) => void }) {
  const { message } = App.useApp();
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | undefined>(value ? `/api/files/${value}` : undefined);
  useEffect(() => setPreview(value ? `/api/files/${value}` : undefined), [value]);
  return (
    <Flex gap={16} align="center">
      <div style={{ width: 160, height: 96, borderRadius: 8, border: "1px dashed var(--lh-border)", overflow: "hidden", display: "grid", placeItems: "center", background: "var(--lh-bg)" }}>
        {preview ? <img src={preview} alt="Ảnh bìa" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <PictureOutlined style={{ fontSize: 24, opacity: 0.4 }} />}
      </div>
      <div>
        <Upload
          accept={ACCEPT}
          showUploadList={false}
          beforeUpload={async (file) => {
            setBusy(true);
            const r = await uploadImage(file);
            setBusy(false);
            if (!r.ok) message.error(r.error);
            else onChange?.(r.name);
            return false;
          }}
        >
          <Button icon={<UploadOutlined />} loading={busy}>{value ? "Đổi ảnh" : "Tải ảnh lên"}</Button>
        </Upload>
        <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, marginTop: 6 }}>JPG, PNG hoặc WebP, tối đa 2 MB.</Typography.Text>
      </div>
    </Flex>
  );
}
