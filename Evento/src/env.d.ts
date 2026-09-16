/// <reference types="astro/client" />

import type { AdminSession } from './lib/server/auth/session';

declare global {
  namespace App {
    interface Locals {
      admin?: AdminSession;
    }
  }
}

export {};
