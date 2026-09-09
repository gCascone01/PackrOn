"use client"

import { useI18n } from "@/components/locale-provider"

const pings = [
	{ className: "left-[22%] top-[28%]", delay: "0ms" },
	{ className: "left-[68%] top-[22%]", delay: "900ms" },
	{ className: "left-[76%] top-[68%]", delay: "1500ms" },
	{ className: "left-[31%] top-[74%]", delay: "2300ms" },
]

export function RouteRadar() {
	const { t } = useI18n()

	return (
		<div
			className="route-radar relative h-32 overflow-hidden rounded-2xl border border-brand/25 bg-brand-muted/45 shadow-inner shadow-brand/10"
			role="img"
			aria-label={t("radarLabel")}
		>
			<div className="absolute inset-0 opacity-45 [background-image:linear-gradient(to_right,oklch(0.58_0.12_224_/_0.1)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.58_0.12_224_/_0.1)_1px,transparent_1px)] [background-size:24px_24px]" />
			<div className="absolute left-1/2 top-1/2 size-56 -translate-x-1/2 -translate-y-1/2 rounded-full border border-brand/25">
				<div className="absolute inset-7 rounded-full border border-brand/20" />
				<div className="absolute inset-14 rounded-full border border-brand/20" />
				<div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-brand/15" />
				<div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-brand/15" />
				<div className="route-radar-sweep absolute left-1/2 top-1/2 h-1/2 w-1/2 origin-top-left -translate-x-px" />
			</div>
			{pings.map((ping, index) => (
				<span
					key={index}
					  className={`route-radar-ping absolute size-2 rounded-full bg-brand shadow-[0_0_0_4px_oklch(0.58_0.12_224_/_0.16)] ${ping.className}`}
					style={{ animationDelay: ping.delay }}
				/>
			))}
			<div className="absolute inset-x-4 bottom-3 flex items-center justify-between text-[9px] font-semibold uppercase tracking-[0.18em] text-brand/60">
				<span>N</span>
				<span>{t("radarScanning")}</span>
				<span>S</span>
			</div>
		</div>
	)
}
