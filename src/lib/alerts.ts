import Swal from 'sweetalert2'

const baseOptions = {
  buttonsStyling: false,
  customClass: { confirmButton: 'swal-confirm', cancelButton: 'swal-cancel' },
}

export function showLoading(title: string, text = 'Espera un momento...') {
  void Swal.fire({ ...baseOptions, title, text, allowEscapeKey: false, allowOutsideClick: false, didOpen: () => Swal.showLoading() })
}

export function closeLoading() { Swal.close() }
export function showSuccess(title: string, text?: string) { return Swal.fire({ ...baseOptions, icon: 'success', title, text, timer: 1800, showConfirmButton: false }) }
export function showError(title: string, text?: string) { return Swal.fire({ ...baseOptions, icon: 'error', title, text }) }
export async function confirmAction(title: string, text: string, confirmButtonText: string) {
  const response = await Swal.fire({ ...baseOptions, icon: 'warning', title, text, showCancelButton: true, confirmButtonText, cancelButtonText: 'Cancelar' })
  return response.isConfirmed
}
