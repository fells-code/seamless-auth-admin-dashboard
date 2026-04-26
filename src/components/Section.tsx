/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

export function Section({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-subtle bg-surface shadow-[0_1px_0_rgba(255,255,255,0.35)_inset]">
      <div className="border-b border-subtle bg-[linear-gradient(180deg,color-mix(in_srgb,var(--surface-alt)_75%,transparent),transparent)] px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h2 className="heading-2">{title}</h2>
            {description && (
              <p className="max-w-2xl text-sm text-muted">{description}</p>
            )}
          </div>

          {actions && <div className="w-full sm:w-auto sm:shrink-0">{actions}</div>}
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-5">{children}</div>
    </section>
  );
}
