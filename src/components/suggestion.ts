import { ReactRenderer } from '@tiptap/react'
import tippy from 'tippy.js'
import { MentionList } from './MentionList'

export const createSuggestion = (users: {id: string, name: string | null, email: string}[]) => ({
  items: ({ query }: { query: string }) => {
    return users
      .filter((item) => {
        const name = item.name || item.email
        return name.toLowerCase().includes(query.toLowerCase())
      })
      .slice(0, 5)
      .map(u => ({ id: u.id, name: u.name || u.email }))
  },

  render: () => {
    let reactRenderer: any
    let popup: any

    return {
      onStart: (props: any) => {
        if (!props.clientRect) {
          return
        }

        reactRenderer = new ReactRenderer(MentionList, {
          props,
          editor: props.editor,
        })

        popup = tippy('body', {
          getReferenceClientRect: props.clientRect,
          appendTo: () => document.body,
          content: reactRenderer.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
        })
      },

      onUpdate(props: any) {
        reactRenderer.updateProps(props)

        if (!props.clientRect) {
          return
        }

        popup[0].setProps({
          getReferenceClientRect: props.clientRect,
        })
      },

      onKeyDown(props: any) {
        if (props.event.key === 'Escape') {
          popup[0].hide()
          return true
        }

        return reactRenderer.ref?.onKeyDown(props)
      },

      onExit() {
        if (popup && popup[0]) popup[0].destroy()
        if (reactRenderer) reactRenderer.destroy()
      },
    }
  },
})
