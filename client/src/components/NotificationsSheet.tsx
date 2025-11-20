import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Card } from "@/components/ui/card";
import { CheckCircle, XCircle, FileText, Info, X } from "lucide-react";
import type { Notification } from "@/App";

interface NotificationsSheetProps {
  notifications: Notification[];
  isOpen: boolean;
  onClose: () => void;
  onMarkRead: (id: string) => void;
}

function getNotificationIcon(type?: string | null) {
  switch (type) {
    case 'deposit_confirmed':
      return { Icon: CheckCircle, className: 'text-green-600 dark:text-green-500', bgClassName: 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800' };
    case 'payment_paid':
      return { Icon: CheckCircle, className: 'text-green-600 dark:text-green-500', bgClassName: 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800' };
    case 'payment_rejected':
      return { Icon: XCircle, className: 'text-red-600 dark:text-red-500', bgClassName: 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800' };
    case 'payment_status_changed':
      return { Icon: FileText, className: 'text-blue-600 dark:text-blue-500', bgClassName: 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800' };
    default:
      return { Icon: Info, className: 'text-gray-600 dark:text-gray-500', bgClassName: 'bg-gray-50 dark:bg-gray-900/10 border-gray-200 dark:border-gray-800' };
  }
}

export default function NotificationsSheet({ notifications, isOpen, onClose, onMarkRead }: NotificationsSheetProps) {
  const handleMarkRead = (id: string) => {
    onMarkRead(id);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Уведомления</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-3">
          {notifications.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Нет уведомлений</p>
            </div>
          ) : (
            notifications.map((notification) => {
              const { Icon, className, bgClassName } = getNotificationIcon(notification.type);
              
              return (
                <Card
                  key={notification.id}
                  className={`p-4 rounded-xl ${
                    notification.isRead ? 'bg-muted/30' : bgClassName
                  }`}
                  data-testid={`notification-${notification.id}`}
                >
                  <div className="flex items-start gap-3">
                    <Icon className={`w-5 h-5 ${className} shrink-0 mt-0.5`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{notification.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(notification.createdAt).toLocaleString('ru-RU', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <button
                        onClick={() => handleMarkRead(notification.id)}
                        className="p-1 rounded-full hover:bg-muted"
                        data-testid={`button-mark-read-${notification.id}`}
                      >
                        <X className="w-4 h-4 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
