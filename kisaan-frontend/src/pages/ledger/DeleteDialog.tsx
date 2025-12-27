import React from 'react';

const DeleteDialog: React.FC<{ open: boolean; onConfirm: () => void; onCancel: () => void; }> = ({ open, onConfirm, onCancel }) => {
  if (!open) return null;
  return (
    <div className="modal">
      <p>Are you sure you want to delete this entry?</p>
      <button onClick={onConfirm}>Yes</button>
      <button onClick={onCancel}>No</button>
    </div>
  );
};

export default DeleteDialog;
