"use client";
import React, {useState} from 'react'
import RichTextEditor from 'react-rte';

interface EditorProps {
  value: string;
  onChange: (content: string) => void;
}

export default function Editor({ value, onChange }: EditorProps) {
  const [editorValue, setEditorValue] = useState(() => 
    RichTextEditor.createValueFromString(value || '', 'html')
  );

  const handleChange = (newValue: any) => {
    setEditorValue(newValue);
    // Convert to HTML and call onChange prop
    onChange(newValue.toString('html'));
  };

  const toolbarConfig = {
    display: [
      'INLINE_STYLE_BUTTONS',
      'BLOCK_TYPE_BUTTONS',
      'LINK_BUTTONS',
      'BLOCK_TYPE_DROPDOWN',
      'HISTORY_BUTTONS',
      'BLOCK_ALIGNMENT_BUTTONS',
    ],
    INLINE_STYLE_BUTTONS: [
      { label: 'Bold', style: 'BOLD', className: 'custom-css-class' },
      { label: 'Italic', style: 'ITALIC' },
      { label: 'Underline', style: 'UNDERLINE' },
    ],
    BLOCK_TYPE_DROPDOWN: [
      { label: 'Normal', style: 'unstyled' },
      { label: 'Heading 1', style: 'header-one' },
      { label: 'Heading 2', style: 'header-two' },
      { label: 'Heading 3', style: 'header-three' },
    ],
    BLOCK_TYPE_BUTTONS: [
      { label: 'UL', style: 'unordered-list-item' },
      { label: 'OL', style: 'ordered-list-item' },
      { label: 'Blockquote', style: 'blockquote' },
    ],
    BLOCK_ALIGNMENT_BUTTONS: [
      { label: 'Left', style: 'ALIGN_LEFT' },
      { label: 'Center', style: 'ALIGN_CENTER' },
      { label: 'Right', style: 'ALIGN_RIGHT' },
      { label: 'Justify', style: 'ALIGN_JUSTIFY' },
    ],
  };

  return (
    <div className="border rounded-md">
      <RichTextEditor
        value={editorValue}
        onChange={handleChange}
        toolbarConfig={toolbarConfig as any}
        className="min-h-[300px] bg-white text-gray-900"/>
      <style jsx global>{`
        .DraftEditor-root {
          min-height: 200px;
          padding: 1rem;
          direction: ltr !important;
        }
        .DraftEditor-editorContainer {
          min-height: 200px;
          direction: ltr !important;
        }
        .public-DraftEditor-content {
          min-height: 200px;
          direction: ltr !important;
          text-align: left !important;
          unicode-bidi: plaintext !important;
        }
        .RichTextEditor__root___2QXK- {
          border: none !important;
          direction: ltr !important;
        }
        .RichTextEditor__editor___1QqIU {
          border-top: 1px solid #e5e7eb !important;
          direction: ltr !important;
        }
        .RichTextEditor__toolbar___1MEqY {
          border: none !important;
          background: #f9fafb !important;
          margin-bottom: 0 !important;
          direction: ltr !important;
        }
        .RichTextEditor__button___1j-Bp {
          min-width: auto !important;
          padding: 6px 8px !important;
          font-size: 14px !important;
          color: #374151 !important;
        }
        .RichTextEditor__button___1j-Bp:hover {
          background: #f3f4f6 !important;
        }
        .RichTextEditor__active___3NcIo {
          background: #e5e7eb !important;
          color: #111827 !important;
        }
        /* Force LTR for editor content */
        [contenteditable="true"] {
          direction: ltr !important;
          text-align: left !important;
          unicode-bidi: plaintext !important;
        }
        /* Ensure all text containers are LTR */
        .DraftEditor-root * {
          direction: ltr !important;
          text-align: left !important;
          unicode-bidi: plaintext !important;
        }
        /* Fix text input direction */
        .public-DraftEditorPlaceholder-root {
          direction: ltr !important;
          text-align: left !important;
          left: 0 !important;
          right: auto !important;
        }
        /* Ensure proper text direction in editor blocks */
        .public-DraftStyleDefault-block {
          direction: ltr !important;
          text-align: left !important;
          unicode-bidi: plaintext !important;
        }
      `}</style>
    </div>
)
}