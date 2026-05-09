import * as React from 'react'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import { useMediaQuery } from '@/hooks/useMediaQuery'

const IsMobileContext = React.createContext(false)

function ResponsiveDialog(props: React.ComponentProps<typeof Dialog>) {
  const isMobile = useMediaQuery('(max-width: 639px)')
  return (
    <IsMobileContext value={isMobile}>
      {isMobile
        ? <Drawer direction="bottom" {...(props as React.ComponentProps<typeof Drawer>)} />
        : <Dialog {...props} />}
    </IsMobileContext>
  )
}

function ResponsiveDialogTrigger(props: React.ComponentProps<typeof DialogTrigger>) {
  const isMobile = React.use(IsMobileContext)
  return isMobile
    ? <DrawerTrigger {...(props as React.ComponentProps<typeof DrawerTrigger>)} />
    : <DialogTrigger {...props} />
}

function ResponsiveDialogClose(props: React.ComponentProps<typeof DialogClose>) {
  const isMobile = React.use(IsMobileContext)
  return isMobile
    ? <DrawerClose {...(props as React.ComponentProps<typeof DrawerClose>)} />
    : <DialogClose {...props} />
}

function ResponsiveDialogContent({
  className,
  children,
  showCloseButton = true,
}: React.ComponentProps<typeof DialogContent>) {
  const isMobile = React.use(IsMobileContext)
  if (isMobile) {
    return (
      <DrawerContent className={className}>
        {children}
      </DrawerContent>
    )
  }
  return (
    <DialogContent className={className} showCloseButton={showCloseButton}>
      {children}
    </DialogContent>
  )
}

function ResponsiveDialogHeader(props: React.ComponentProps<typeof DialogHeader>) {
  const isMobile = React.use(IsMobileContext)
  return isMobile
    ? <DrawerHeader {...props} />
    : <DialogHeader {...props} />
}

function ResponsiveDialogFooter({
  showCloseButton,
  children,
  ...props
}: React.ComponentProps<typeof DialogFooter> & { showCloseButton?: boolean }) {
  const isMobile = React.use(IsMobileContext)
  if (isMobile) {
    return (
      <DrawerFooter {...props}>
        {children}
        {showCloseButton && (
          <DrawerClose asChild>
            <button type="button" className="w-full border border-border py-2 text-xs font-[var(--br-mono-font)] uppercase">
              Đóng
            </button>
          </DrawerClose>
        )}
      </DrawerFooter>
    )
  }
  return (
    <DialogFooter showCloseButton={showCloseButton} {...props}>
      {children}
    </DialogFooter>
  )
}

function ResponsiveDialogTitle(props: React.ComponentProps<typeof DialogTitle>) {
  const isMobile = React.use(IsMobileContext)
  return isMobile
    ? <DrawerTitle {...(props as React.ComponentProps<typeof DrawerTitle>)} />
    : <DialogTitle {...props} />
}

function ResponsiveDialogDescription(props: React.ComponentProps<typeof DialogDescription>) {
  const isMobile = React.use(IsMobileContext)
  return isMobile
    ? <DrawerDescription {...(props as React.ComponentProps<typeof DrawerDescription>)} />
    : <DialogDescription {...props} />
}

export {
  ResponsiveDialog,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
}
