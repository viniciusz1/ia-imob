"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Tabs as TabsPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-[orientation=horizontal]:flex-col",
        className
      )}
      {...props}
    />
  )
}

// "default" is the segmented control: a bordered track holding the options,
// the selected one solid green like the primary button. "line" is the underline variant for
// tabs that sit on a border.
const tabsListVariants = cva(
  "group/tabs-list text-muted-foreground inline-flex w-fit items-center group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col",
  {
    variants: {
      variant: {
        default: "h-auto max-w-full gap-1 overflow-x-auto rounded-lg border bg-muted p-1",
        line: "h-auto gap-1 rounded-none border-b bg-transparent p-0",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 text-sm whitespace-nowrap text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "group-data-[variant=default]/tabs-list:h-8 group-data-[variant=default]/tabs-list:rounded-md group-data-[variant=default]/tabs-list:px-3.5 group-data-[variant=default]/tabs-list:font-medium group-data-[variant=default]/tabs-list:text-foreground/85 group-data-[variant=default]/tabs-list:hover:bg-secondary group-data-[variant=default]/tabs-list:hover:text-foreground group-data-[variant=default]/tabs-list:data-[state=active]:bg-brand-button group-data-[variant=default]/tabs-list:data-[state=active]:text-brand-button-foreground group-data-[variant=default]/tabs-list:data-[state=active]:shadow-sm group-data-[variant=default]/tabs-list:data-[state=active]:hover:bg-brand-button-hover",
        "group-data-[variant=line]/tabs-list:-mb-px group-data-[variant=line]/tabs-list:border-b-2 group-data-[variant=line]/tabs-list:border-transparent group-data-[variant=line]/tabs-list:px-4 group-data-[variant=line]/tabs-list:py-3 group-data-[variant=line]/tabs-list:data-[state=active]:border-primary group-data-[variant=line]/tabs-list:data-[state=active]:text-foreground",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
