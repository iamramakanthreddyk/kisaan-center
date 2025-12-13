import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { CheckCircle, XCircle, AlertTriangle, Info, AlertCircle } from "lucide-react"

function getToastIcon(variant?: "default" | "destructive" | "success" | "warning" | "info" | null) {
  switch (variant) {
    case 'success':
      return <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
    case 'destructive':
      return <XCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
    case 'info':
      return <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
    default:
      return <AlertCircle className="h-4 w-4 text-gray-600 flex-shrink-0 mt-0.5" />
  }
}

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        return (
          <Toast key={id} variant={variant} {...props}>
            <div className="flex items-start gap-3 w-full">
              {getToastIcon(variant)}
              <div className="grid gap-1 flex-1 min-w-0">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
