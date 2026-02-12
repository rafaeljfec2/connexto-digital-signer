"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Avatar, Button, Pagination, Skeleton, Input, Dialog } from '@/shared/ui';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { EmptyState } from '@/features/documents/components/empty-state';
import {
  listTenantSigners,
  createTenantSigner,
  updateTenantSigner,
  deleteTenantSigner,
  searchTenantSigners,
  type TenantSigner,
  type CreateTenantSignerInput,
} from '@/features/documents/api';
import { PageTransition } from '@/shared/animations';
import { formatCpf, isValidCpf } from '@/shared/utils/cpf';
import {
  Mail,
  MoreVertical,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';

export default function SignersManagementPage() {
  const tCommon = useTranslations('common');
  const tSigners = useTranslations('signers');
  const locale = useLocale();
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [contacts, setContacts] = useState<TenantSigner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<TenantSigner | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TenantSigner | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formCpf, setFormCpf] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formBirthDate, setFormBirthDate] = useState('');

  const limit = 10;

  const loadContacts = useCallback(async () => {
    setIsLoading(true);
    try {
      if (searchQuery.trim().length >= 2) {
        const results = await searchTenantSigners(searchQuery.trim());
        setContacts(results);
        setTotalPages(1);
      } else {
        const result = await listTenantSigners({ page, limit });
        setContacts(result.data as TenantSigner[]);
        setTotalPages(result.meta.totalPages);
      }
    } catch {
      setContacts([]);
    } finally {
      setIsLoading(false);
    }
  }, [page, searchQuery]);

  useEffect(() => {
    void loadContacts();
  }, [loadContacts]);

  const handleSearchChange = (value: string) => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    setSearchQuery(value);
    searchTimerRef.current = setTimeout(() => {
      setPage(1);
    }, 300);
  };

  const formatDate = useCallback(
    (value: string | null) => {
      if (!value) return '—';
      return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(
        new Date(value),
      );
    },
    [locale],
  );

  const resetForm = () => {
    setFormName('');
    setFormEmail('');
    setFormCpf('');
    setFormPhone('');
    setFormBirthDate('');
    setEditingContact(null);
  };

  const openAddModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = (contact: TenantSigner) => {
    setEditingContact(contact);
    setFormName(contact.name);
    setFormEmail(contact.email);
    setFormCpf(contact.cpf ? formatCpf(contact.cpf) : '');
    setFormPhone(contact.phone ?? '');
    setFormBirthDate(contact.birthDate ?? '');
    setModalOpen(true);
  };

  const cpfDigits = formCpf.replaceAll(/\D/g, '');
  const isCpfTouched = cpfDigits.length > 0;
  const isCpfComplete = cpfDigits.length === 11;
  const cpfValid = !isCpfTouched || (isCpfComplete && isValidCpf(formCpf));

  const handleSave = async () => {
    if (!formName.trim() || !formEmail.trim()) return;
    if (isCpfTouched && !isValidCpf(formCpf)) return;
    setIsSaving(true);
    try {
      const data: CreateTenantSignerInput = {
        name: formName.trim(),
        email: formEmail.trim(),
        cpf: formCpf.trim() || undefined,
        phone: formPhone.trim() || undefined,
        birthDate: formBirthDate.trim() || undefined,
      };

      if (editingContact) {
        await updateTenantSigner(editingContact.id, data);
      } else {
        await createTenantSigner(data);
      }

      setModalOpen(false);
      resetForm();
      await loadContacts();
    } catch {
      // error handled by API client
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteTenantSigner(deleteTarget.id);
      setDeleteTarget(null);
      await loadContacts();
    } catch {
      // error handled by API client
    }
  };

  const isEditing = editingContact !== null;

  return (
    <PageTransition>
      <div className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-medium text-foreground">
              {tCommon('signersTitle')}
            </h1>
            <p className="text-sm text-foreground-muted">
              {tCommon('signersSubtitle')}
            </p>
          </div>
          <Button type="button" className="gap-2" onClick={openAddModal}>
            <Plus className="h-4 w-4" />
            {tCommon('signersActions.addNew')}
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted" />
          <Input
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={tCommon('signersFilters.search')}
            className="pl-10"
          />
        </div>

        <div className="glass-card rounded-2xl p-4">
          <ContactsTable
            contacts={contacts}
            isLoading={isLoading}
            formatDate={formatDate}
            labels={{
              name: tCommon('signersTable.name'),
              email: tCommon('signersTable.email'),
              cpf: tCommon('signersTable.cpf'),
              phone: tCommon('signersTable.phone'),
              createdAt: tCommon('signersTable.createdAt'),
              edit: tCommon('signersActions.edit'),
              delete: tCommon('signersActions.delete'),
              emptyTitle: tCommon('signersEmptyTitle'),
              emptyDescription: tCommon('signersEmptyDescription'),
            }}
            onEdit={openEditModal}
            onDelete={setDeleteTarget}
          />
        </div>

        {!searchQuery.trim() && (
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            previousLabel={tCommon('signersPagination.previous')}
            nextLabel={tCommon('signersPagination.next')}
            pageLabel={tCommon('signersPagination.page')}
          />
        )}

        <Dialog
          open={modalOpen}
          onClose={() => {
            setModalOpen(false);
            resetForm();
          }}
          title={isEditing ? tCommon('signersActions.edit') : tCommon('signersActions.addNew')}
          footer={
            <>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setModalOpen(false);
                  resetForm();
                }}
              >
                {tSigners('cancel')}
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                isLoading={isSaving}
                disabled={!formName.trim() || !formEmail.trim() || !cpfValid}
              >
                {isEditing ? tSigners('save') : tSigners('confirm')}
              </Button>
            </>
          }
        >
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-normal text-foreground-muted">
                {tSigners('nameLabel')}
              </label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={tSigners('namePlaceholder')}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-normal text-foreground-muted">
                {tSigners('emailLabel')}
              </label>
              <Input
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder={tSigners('emailPlaceholder')}
                type="email"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-normal text-foreground-muted">
                {tSigners('cpfLabel')}
              </label>
              <Input
                value={formCpf}
                onChange={(e) => setFormCpf(formatCpf(e.target.value))}
                placeholder={tSigners('cpfPlaceholder')}
                className={isCpfTouched && isCpfComplete && !cpfValid ? 'border-error' : ''}
              />
              {isCpfTouched && isCpfComplete && !cpfValid && (
                <p className="text-xs text-error">{tSigners('cpfInvalid')}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-normal text-foreground-muted">
                {tSigners('phoneLabel')}
              </label>
              <Input
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder={tSigners('phonePlaceholder')}
                type="tel"
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-normal text-foreground-muted">
                {tSigners('birthDateLabel')}
              </label>
              <Input
                value={formBirthDate}
                onChange={(e) => setFormBirthDate(e.target.value)}
                placeholder={tSigners('birthDatePlaceholder')}
                type="date"
              />
            </div>
          </div>
        </Dialog>

        <ConfirmDialog
          open={deleteTarget !== null}
          onCancel={() => setDeleteTarget(null)}
          title={tCommon('signersActions.confirmDelete')}
          description={tCommon('signersActions.confirmDeleteDescription')}
          confirmLabel={tCommon('signersActions.delete')}
          cancelLabel={tSigners('cancel')}
          onConfirm={handleDelete}
          variant="danger"
        />
      </div>
    </PageTransition>
  );
}

type ContactsTableLabels = Readonly<{
  name: string;
  email: string;
  cpf: string;
  phone: string;
  createdAt: string;
  edit: string;
  delete: string;
  emptyTitle: string;
  emptyDescription: string;
}>;

type ContactsTableProps = Readonly<{
  contacts: ReadonlyArray<TenantSigner>;
  isLoading: boolean;
  formatDate: (value: string | null) => string;
  labels: ContactsTableLabels;
  onEdit: (contact: TenantSigner) => void;
  onDelete: (contact: TenantSigner) => void;
}>;

function ContactRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>
      <Skeleton className="hidden h-4 w-24 md:block" />
      <Skeleton className="hidden h-4 w-24 lg:block" />
      <Skeleton className="h-8 w-8" />
    </div>
  );
}

function ContactsTable({
  contacts,
  isLoading,
  formatDate,
  labels,
  onEdit,
  onDelete,
}: ContactsTableProps) {
  if (!isLoading && contacts.length === 0) {
    return (
      <EmptyState title={labels.emptyTitle} description={labels.emptyDescription} />
    );
  }

  return (
    <div className="rounded-xl border border-th-border bg-th-card">
      <div className="hidden items-center gap-3 rounded-t-xl border-b border-th-border bg-th-hover/50 px-4 py-2.5 sm:flex">
        <div className="w-9 shrink-0" />
        <p className="min-w-0 flex-1 text-[10px] font-medium uppercase tracking-widest text-foreground-subtle">
          {labels.name}
        </p>
        <p className="hidden w-28 text-[10px] font-medium uppercase tracking-widest text-foreground-subtle md:block">
          {labels.cpf}
        </p>
        <p className="hidden w-28 text-[10px] font-medium uppercase tracking-widest text-foreground-subtle lg:block">
          {labels.phone}
        </p>
        <p className="hidden w-24 text-center text-[10px] font-medium uppercase tracking-widest text-foreground-subtle lg:block">
          {labels.createdAt}
        </p>
        <div className="w-20" />
      </div>

      <div className="divide-y divide-th-border">
        {isLoading
          ? Array.from({ length: 5 }, (_, i) => (
              <ContactRowSkeleton key={`skeleton-${String(i)}`} />
            ))
          : contacts.map((contact) => (
              <ContactRow
                key={contact.id}
                contact={contact}
                labels={labels}
                formatDate={formatDate}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
      </div>
    </div>
  );
}

type ContactRowProps = Readonly<{
  contact: TenantSigner;
  labels: ContactsTableLabels;
  formatDate: (value: string | null) => string;
  onEdit: (contact: TenantSigner) => void;
  onDelete: (contact: TenantSigner) => void;
}>;

function ContactRow({
  contact,
  labels,
  formatDate,
  onEdit,
  onDelete,
}: ContactRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  return (
    <div className="group flex w-full items-center gap-3 px-4 py-3 transition-colors hover:bg-th-hover">
      <Avatar name={contact.name} size="sm" />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-normal text-foreground">
          {contact.name}
        </p>
        <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-foreground-subtle">
          <Mail className="h-3 w-3 shrink-0" />
          {contact.email}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2 sm:hidden">
          {contact.cpf && (
            <span className="text-[10px] text-foreground-subtle">{contact.cpf}</span>
          )}
          {contact.phone && (
            <span className="flex items-center gap-1 text-[10px] text-foreground-subtle">
              <Phone className="h-3 w-3" />
              {contact.phone}
            </span>
          )}
        </div>
      </div>

      <p className="hidden w-28 truncate text-xs text-foreground-muted md:block">
        {contact.cpf ?? '—'}
      </p>

      <p className="hidden w-28 truncate text-xs text-foreground-muted lg:block">
        {contact.phone ?? '—'}
      </p>

      <p className="hidden w-24 text-center text-xs text-foreground-muted lg:block">
        {formatDate(contact.createdAt)}
      </p>

      <div ref={menuRef} className="relative flex w-20 items-center justify-end gap-1">
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground-subtle transition-colors hover:bg-th-hover hover:text-foreground"
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          <MoreVertical className="h-4 w-4" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full z-30 mt-1 min-w-[160px] overflow-hidden rounded-xl border border-th-border bg-th-dialog shadow-lg">
            <button
              type="button"
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-th-hover"
              onClick={() => {
                setMenuOpen(false);
                onEdit(contact);
              }}
            >
              <Pencil className="h-4 w-4 shrink-0" />
              {labels.edit}
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-error transition-colors hover:bg-th-hover"
              onClick={() => {
                setMenuOpen(false);
                onDelete(contact);
              }}
            >
              <Trash2 className="h-4 w-4 shrink-0" />
              {labels.delete}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
