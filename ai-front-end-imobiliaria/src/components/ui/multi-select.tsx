"use client"

import * as React from "react"
import { ChevronDownIcon, SearchIcon, XIcon } from "lucide-react"

import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface MultiSelectProps {
  /** Id of the trigger, so a `<label htmlFor>` names it. */
  id: string
  options: string[]
  value: string[]
  onChange: (value: string[]) => void
  placeholder: string
  searchPlaceholder?: string
  emptyMessage?: string
  disabled?: boolean
  className?: string
}

/**
 * Multi-choice dropdown after the reference dropdown: a field-like trigger
 * that summarises the choice ("Centro +2"), and a panel with a search box,
 * one checkbox row per option split by dividers, and a footer to clear.
 */
function MultiSelect({
  id,
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder = "Buscar...",
  emptyMessage = "Nenhuma opção encontrada.",
  disabled = false,
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")

  const visibleOptions = React.useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR")
    if (!term) return options
    return options.filter((option) => option.toLocaleLowerCase("pt-BR").includes(term))
  }, [options, search])

  const summary =
    value.length === 0
      ? placeholder
      : value.length === 1
        ? value[0]
        : `${value[0]} +${value.length - 1}`

  function toggle(option: string, checked: boolean) {
    onChange(checked ? [...value, option] : value.filter((item) => item !== option))
  }

  return (
    <Popover
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setSearch("")
      }}
      open={open}
    >
      <PopoverTrigger asChild>
        <button
          aria-haspopup="listbox"
          className={cn(
            "flex h-11 w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-lg border border-input bg-field px-3.5 text-left text-sm shadow-xs shadow-black/5 transition-colors outline-none hover:border-muted-foreground/40 focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 data-[state=open]:border-primary data-[state=open]:ring-1 data-[state=open]:ring-primary",
            className
          )}
          data-slot="multi-select"
          disabled={disabled}
          id={id}
          type="button"
        >
          <span className={cn("truncate", value.length === 0 && "text-muted-foreground/70")} title={value.join(", ")}>
            {summary}
          </span>
          <span className="flex shrink-0 items-center gap-2">
            {value.length > 1 && (
              <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-xs font-semibold text-primary tabular-nums">
                {value.length}
              </span>
            )}
            <ChevronDownIcon className="size-4 text-muted-foreground" />
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-(--radix-popover-trigger-width) min-w-64 overflow-hidden p-0"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <div className="relative border-b">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            aria-label={searchPlaceholder}
            className="h-11 w-full bg-transparent pr-3 pl-10 text-sm outline-none placeholder:text-muted-foreground/70"
            onChange={(event) => setSearch(event.target.value)}
            placeholder={searchPlaceholder}
            type="search"
            value={search}
          />
        </div>

        <div aria-multiselectable="true" className="max-h-64 overflow-y-auto" role="listbox">
          {visibleOptions.length === 0 ? (
            <p className="px-3.5 py-6 text-center text-sm text-muted-foreground">{emptyMessage}</p>
          ) : (
            visibleOptions.map((option) => {
              const checked = value.includes(option)
              return (
                <label
                  aria-selected={checked}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 border-b px-3.5 py-2.5 text-sm transition-colors last:border-b-0 hover:bg-secondary",
                    checked && "font-medium text-primary"
                  )}
                  key={option}
                  role="option"
                >
                  <Checkbox checked={checked} onCheckedChange={(next) => toggle(option, next === true)} />
                  <span className="truncate">{option}</span>
                </label>
              )
            })
          )}
        </div>

        {value.length > 0 && (
          <div className="flex items-center justify-between gap-3 border-t bg-muted/50 px-3.5 py-2.5 text-[0.8125rem]">
            <span className="text-muted-foreground tabular-nums">
              {value.length} {value.length === 1 ? "selecionado" : "selecionados"}
            </span>
            <button
              className="flex cursor-pointer items-center gap-1 font-medium text-primary hover:underline"
              onClick={() => onChange([])}
              type="button"
            >
              <XIcon className="size-3.5" />
              Limpar
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

export { MultiSelect }
