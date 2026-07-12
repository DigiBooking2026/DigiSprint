import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import Mention from '@tiptap/extension-mention'
import { createSuggestion } from './suggestion'
import { 
  Bold, Italic, Underline as UnderlineIcon, 
  List, ListOrdered, Image as ImageIcon, 
  Link as LinkIcon, Heading1, Heading2, 
  Undo, Redo 
} from 'lucide-react'
import { Button } from './ui/button'
import { useEffect, useRef } from 'react'
import { markdownToHtml, looksLikeMarkdown } from '../lib/markdown'

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  minHeight?: string
  users?: {id: string, name: string | null, email: string}[]
}

export function RichTextEditor({ content, onChange, minHeight = "min-h-[150px]", users = [] }: RichTextEditorProps) {
  // Keep a live handle to the editor so the paste handler (created at editor
  // init time, before `editor` exists) can call commands once it's ready.
  const editorRef = useRef<Editor | null>(null)
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
      }),
      Image.configure({
        allowBase64: true,
      }),
      Mention.configure({
        HTMLAttributes: {
          class: 'mention bg-primary/20 text-primary px-1 rounded-sm font-medium',
        },
        suggestion: createSuggestion(users),
      }),
    ],
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm dark:prose-invert max-w-none ${minHeight} p-3 focus:outline-none border rounded-b-md border-t-0`,
      },
      // Paste a raw ".md" doc and have it become formatted rich text — like
      // Jira. Only intercept plain-text pastes that look like Markdown; let
      // TipTap handle rich HTML pastes (e.g. copied from a web page) normally.
      handlePaste: (_view, event) => {
        const ed = editorRef.current
        if (!ed) return false
        const text = event.clipboardData?.getData('text/plain') ?? ''
        const html = event.clipboardData?.getData('text/html') ?? ''
        if (text && !html && looksLikeMarkdown(text)) {
          event.preventDefault()
          ed.chain().focus().insertContent(markdownToHtml(text)).run()
          return true
        }
        return false
      },
    },
  })

  useEffect(() => {
    editorRef.current = editor
  }, [editor])

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content)
    }
  }, [content, editor])

  if (!editor) return null

  const addImage = () => {
    const url = window.prompt('URL d\'image')
    if (url) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }

  const setLink = () => {
    const url = window.prompt('URL du lien')
    if (url) {
      editor.chain().focus().setLink({ href: url }).run()
    }
  }

  return (
    <div className="flex flex-col focus-within:ring-1 focus-within:ring-ring rounded-md">
      <div className="flex flex-wrap gap-1 p-1 bg-muted rounded-t-md border">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'bg-accent' : ''}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'bg-accent' : ''}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={editor.isActive('underline') ? 'bg-accent' : ''}
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>
        <div className="w-[1px] bg-border mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={editor.isActive('heading', { level: 1 }) ? 'bg-accent' : ''}
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={editor.isActive('heading', { level: 2 }) ? 'bg-accent' : ''}
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        <div className="w-[1px] bg-border mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? 'bg-accent' : ''}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive('orderedList') ? 'bg-accent' : ''}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <div className="w-[1px] bg-border mx-1" />
        <Button type="button" variant="ghost" size="sm" onClick={setLink} className={editor.isActive('link') ? 'bg-accent' : ''}>
          <LinkIcon className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={addImage}>
          <ImageIcon className="h-4 w-4" />
        </Button>
        <div className="flex-1" />
        <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().undo().run()}>
          <Undo className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().redo().run()}>
          <Redo className="h-4 w-4" />
        </Button>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
