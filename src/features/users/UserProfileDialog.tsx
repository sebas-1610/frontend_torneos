import { LoaderCircle, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { User } from '../../api/auth'
import { ApiError, errorMessage } from '../../api/client'
import {
  createUserProfile,
  deleteUserProfile,
  findUserProfile,
  updateUserProfile,
  type Profile,
} from '../../api/profile'
import { RESOURCES, useAccess } from '../../auth/access'
import { SubjectUser } from '../../components/ConfirmDialog'
import { useConfirm } from '../../hooks/useConfirm'
import { initials } from '../../utils/initials'
import { ProfileFields } from '../profile/ProfileFields'
import { useProfileDraft } from '../profile/useProfileDraft'
import '../auth/LoginPage.css'
import '../../components/ListPage.css'

interface UserProfileDialogProps {
  user: User
  onClose: () => void
  onOwnPhotoChange: (photo: string | null) => void // si es el propio perfil, se actualiza el avatar de arriba
}

// Ventana "Perfil" desde el listado de usuarios (HU-SE-01 y HU-SE-02): el administrador consulta,
// registra, actualiza o elimina el perfil de un usuario. Usa /api/users/{userId}/profile.
export function UserProfileDialog({ user, onClose, onOwnPhotoChange }: UserProfileDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const { can, userId } = useAccess()
  const { confirm, confirmDialog } = useConfirm()
  const draft = useProfileDraft()
  const { fill } = draft
  const [saved, setSaved] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null)

  const isOwn = user.id === userId
  // Crear o cambiar pide el permiso correspondiente de "perfiles"; sin él, el formulario es de solo lectura.
  const canWrite = saved ? can(RESOURCES.profiles, 'UPDATE') : can(RESOURCES.profiles, 'CREATE')
  const canDelete = saved !== null && can(RESOURCES.profiles, 'DELETE')

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  useEffect(() => {
    let active = true
    findUserProfile(user.id)
      .then((found) => {
        if (!active) return
        setSaved(found)
        fill(found)
      })
      .catch((err) => {
        if (!active) return
        // 404: el usuario todavía no tiene perfil.
        if (!(err instanceof ApiError && err.status === 404)) setError(errorMessage(err))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [user.id, fill])

  const { input } = draft
  const canSubmit = canWrite && draft.valid && draft.differsFrom(saved) && !busy
  const previewPhoto = input.photo && draft.photoOk && input.photo !== failedPhoto ? input.photo : null

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const result = saved ? await updateUserProfile(user.id, input) : await createUserProfile(user.id, input)
      setSaved(result)
      fill(result)
      if (isOwn) onOwnPhotoChange(result.photo)
      setNotice(saved ? 'Perfil actualizado correctamente.' : 'Perfil creado correctamente.')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    const confirmed = await confirm({
      title: `¿Eliminar el perfil de ${user.name}?`,
      message: 'Se borran su teléfono, su foto y su fecha de nacimiento. La cuenta, sus roles y su acceso siguen igual.',
      confirmLabel: 'Eliminar perfil',
      subject: <SubjectUser name={user.name} email={user.email} />,
    })
    if (!confirmed) return
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await deleteUserProfile(user.id)
      setSaved(null)
      fill(null)
      if (isOwn) onOwnPhotoChange(null)
      setNotice('Perfil eliminado.')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <dialog ref={dialogRef} className="form-dialog" onClose={onClose} aria-labelledby="user-profile-title">
        <form className="form-dialog__form" onSubmit={handleSubmit} noValidate>
          <div className="dialog-identity">
            <span className="profile-avatar profile-avatar--sm" aria-hidden="true">
              {previewPhoto ? (
                <img src={previewPhoto} alt="" onError={() => setFailedPhoto(previewPhoto)} />
              ) : (
                initials(user.name)
              )}
            </span>
            <div className="dialog-identity__text">
              <h2 id="user-profile-title" className="panel__title">
                Perfil de {user.name}
              </h2>
              <p className="dialog-identity__detail">{user.email}</p>
            </div>
          </div>

          {loading ? (
            <p className="empty-state">Cargando perfil…</p>
          ) : (
            <>
              {saved === null && (
                <p className="dialog-note">
                  {canWrite
                    ? 'Este usuario todavía no tiene perfil. Puedes registrarlo ahora.'
                    : 'Este usuario todavía no tiene perfil.'}
                </p>
              )}
              <ProfileFields
                draft={draft}
                disabled={!canWrite || busy}
                photoFailed={draft.photoOk && input.photo !== null && input.photo === failedPhoto}
              />
            </>
          )}

          {notice && !error && <p className="login__notice">{notice}</p>}
          {error && (
            <p className="login__error" role="alert">
              {error}
            </p>
          )}

          <div className="form-dialog__actions dialog-actions--split">
            {canDelete && (
              <button
                type="button"
                className="button button--text row-actions__danger"
                onClick={handleDelete}
                disabled={busy || loading}
              >
                <Trash2 size={16} aria-hidden="true" />
                Eliminar perfil
              </button>
            )}
            <button type="button" className="button button--outline" onClick={() => dialogRef.current?.close()}>
              Cerrar
            </button>
            {canWrite && !loading && (
              <button type="submit" className="button button--primary" disabled={!canSubmit}>
                {busy && <LoaderCircle size={16} aria-hidden="true" className="spin" />}
                {saved ? 'Guardar cambios' : 'Crear perfil'}
              </button>
            )}
          </div>
        </form>
      </dialog>
      {confirmDialog}
    </>
  )
}
