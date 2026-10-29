/* ============================================================
   EMAILJS CONFIG (jawaban user #8: form → EmailJS)
   ⚠ Nilai di bawah masih placeholder. Buat account di emailjs.com,
   lalu isi Service ID / Template ID / Public Key.
   Untuk development, kosong = form menampilkan "dry-run" tanpa kirim.
   ============================================================ */

import type { EmailJsConfig } from '../types';

export const emailjsConfig: EmailJsConfig = {
  serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID ?? '',
  templateId: import.meta.env.VITE_EMAILJS_TEMPLATE_ID ?? '',
  publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY ?? '',
};

export const isEmailJsConfigured = (): boolean =>
  Boolean(emailjsConfig.serviceId && emailjsConfig.templateId && emailjsConfig.publicKey);
