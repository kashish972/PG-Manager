'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Send, Loader2, MessageSquare, MessageCircle, Phone, Bell, BellOff } from 'lucide-react';
import styles from './NotificationModal.module.css';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  person: {
    _id: string;
    name: string;
    phone: string;
    roomNumber?: string;
    blockName?: string;
  };
  onSend: (personId: string, message: string, method: 'whatsapp' | 'sms' | 'push') => Promise<{ success: boolean; error?: string }>;
}

type NotificationMethod = 'whatsapp' | 'sms' | 'push';

export function NotificationModal({ isOpen, onClose, person, onSend }: NotificationModalProps) {
  const [message, setMessage] = useState('');
  const [method, setMethod] = useState<NotificationMethod>('whatsapp');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [pushEnabled, setPushEnabled] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPushEnabled(Notification.permission === 'granted');
    }
  }, []);

  const handleSend = async () => {
    if (!message.trim()) {
      setError('Please enter a message');
      return;
    }

    setIsSending(true);
    setError('');
    
    const result = await onSend(person._id, message, method);
    
    setIsSending(false);
    
    if (result?.error) {
      setError(result.error);
    } else {
      setMessage('');
      onClose();
    }
  };

  const handleEnablePush = async () => {
    if (!('Notification' in window)) {
      setError('Push notifications not supported');
      return;
    }

    if (Notification.permission === 'denied') {
      setError('Push notifications blocked. Enable in browser settings.');
      return;
    }

    const permission = await Notification.requestPermission();
    setPushEnabled(permission === 'granted');
    
    if (permission !== 'granted') {
      setError('Push permission denied');
    }
  };

  const quickMessages = [
    { label: 'Rent Reminder', template: `Dear ${person.name}, your rent payment is pending. Please make the payment at the earliest.` },
    { label: 'Rent Overdue', template: `Dear ${person.name}, your rent for this month is overdue. Kindly clear the payment ASAP to avoid any inconvenience.` },
    { label: 'Payment Received', template: `Dear ${person.name}, we have received your rent payment. Thank you!` },
    { label: 'General Notice', template: `Dear ${person.name}, this is an important notice from PG Management. Please contact us for more details.` },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Send Notification" size="md">
      <div className={styles.content}>
        <div className={styles.personInfo}>
          <div className={styles.avatar}>
            <MessageSquare size={24} />
          </div>
          <div className={styles.details}>
            <h3>{person.name}</h3>
            <p>{person.phone}</p>
            {(person.roomNumber || person.blockName) && (
              <span className={styles.roomInfo}>
                {person.blockName && `${person.blockName} - `}Room {person.roomNumber}
              </span>
            )}
          </div>
        </div>

        <div className={styles.methodSelection}>
          <span className={styles.label}>Send via:</span>
          <div className={styles.methodButtons}>
            <button
              className={`${styles.methodBtn} ${method === 'whatsapp' ? styles.methodActive : ''}`}
              onClick={() => setMethod('whatsapp')}
            >
              <MessageCircle size={18} />
              WhatsApp
            </button>
            <button
              className={`${styles.methodBtn} ${method === 'sms' ? styles.methodActive : ''}`}
              onClick={() => setMethod('sms')}
            >
              <Phone size={18} />
              SMS
            </button>
            <button
              className={`${styles.methodBtn} ${method === 'push' ? styles.methodActive : ''}`}
              onClick={() => setMethod('push')}
            >
              {pushEnabled ? <Bell size={18} /> : <BellOff size={18} />}
              Push
            </button>
          </div>
          {method === 'push' && !pushEnabled && (
            <button onClick={handleEnablePush} className={styles.enablePushBtn}>
              Click to enable push notifications
            </button>
          )}
        </div>

        <div className={styles.quickMessages}>
          <span className={styles.label}>Quick Messages:</span>
          <div className={styles.messageButtons}>
            {quickMessages.map((qm, index) => (
              <button
                key={index}
                className={styles.quickBtn}
                onClick={() => setMessage(qm.template)}
              >
                {qm.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.formGroup}>
          <label>Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter your message here..."
            rows={5}
            className={styles.textarea}
          />
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.actions}>
          <button onClick={onClose} className={styles.cancelBtn} disabled={isSending}>
            Cancel
          </button>
          <button onClick={handleSend} className={styles.sendBtn} disabled={isSending || !message.trim()}>
            {isSending ? (
              <>
                <Loader2 size={18} className={styles.spinner} />
                Sending...
              </>
            ) : (
              <>
                <Send size={18} />
                Send via {method === 'whatsapp' ? 'WhatsApp' : method === 'sms' ? 'SMS' : 'Push'}
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}