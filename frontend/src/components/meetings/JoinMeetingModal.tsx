"use client";

import { Modal } from "@/components/ui/Modal";
import { JoinMeetingForm } from "./JoinMeetingForm";

interface JoinMeetingModalProps {
  title?: string;
  defaultName?: string;
  onClose: () => void;
}

export function JoinMeetingModal({ title = "Join meeting", defaultName, onClose }: JoinMeetingModalProps) {
  return (
    <Modal title={title} onClose={onClose} width={400}>
      <JoinMeetingForm defaultName={defaultName} onCancel={onClose} />
    </Modal>
  );
}
