import React from "react"

export type SectionKitProps = {
	children: React.ReactNode
	title?: string
}

export const SectionKit: React.FC<SectionKitProps> = ({ children, title }) => (
	<section>
		{title && <h2>{title}</h2>}
		{children}
	</section>
)
