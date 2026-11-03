'use client';
import { cloneElement, isValidElement, useEffect, useId, type ReactNode } from 'react';
import { X, Popcorn, AlertCircle, LoaderCircle, Check } from 'lucide-react';
import { stateLabels } from '@/modules/domain';
export function Logo() { return <span className="logo"><span className="logo-symbol"><Popcorn strokeWidth={1.4} size={29} /></span><span><span className="logo-small">A MOÇA</span><span className="logo-large">da Pipoca<span className="logo-dot">.</span></span></span></span>; }
export function Loading({ text = 'Preparando tudo para você…' }: { text?: string }) { return <div className="loading" role="status"><LoaderCircle className="spin" size={24} /><p>{text}</p></div>; }
export function Notice({ children, success = false }: { children?: ReactNode; success?: boolean }) { return children ? <div className={`notice ${success ? 'notice-success' : ''}`} role={success ? 'status' : 'alert'}>{success ? <Check size={18} /> : <AlertCircle size={18} />}<span>{children}</span></div> : null; }
export function Badge({ state }: { state: string }) { return <span className={`badge badge-${state}`}>{stateLabels[state] || state}</span>; }
export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); if (event.key === 'Tab') { const elements = [...document.querySelectorAll<HTMLElement>('.modal button, .modal input, .modal select, .modal textarea, .modal a')].filter(e => !e.hasAttribute('disabled')); const first = elements[0], last = elements.at(-1); if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); } } };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    document.querySelector<HTMLElement>('.modal .close-button')?.focus();
    return () => { document.body.style.overflow = ''; document.removeEventListener('keydown', onKey); previous?.focus(); };
  }, [onClose]);
  return <div className="modal-overlay" onClick={event => { if (event.target === event.currentTarget) onClose(); }}><section className="modal" role="dialog" aria-modal="true" aria-label={title}><div className="modal-heading"><h2>{title}</h2><button className="icon-button close-button" onClick={onClose} aria-label="Fechar"><X size={21} /></button></div>{children}</section></div>;
}
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  const generated = useId();
  const child = isValidElement<Record<string, any>>(children) ? children : null;
  const id = child?.props.id || generated;
  return <div className="field"><label className="field-label" htmlFor={id}>{label}</label>{child ? cloneElement(child, { id, ...(hint ? { 'aria-describedby': `${id}-hint` } : {}) }) : children}{hint && <small id={`${id}-hint`}>{hint}</small>}</div>;
}
