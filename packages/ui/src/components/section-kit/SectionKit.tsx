import type { ReactNode, FC } from "react"

export type SectionKitProps = {
	children: ReactNode
	title?: string
}

export const SectionKit: FC<SectionKitProps> = ({ children, title }) => (
	<section>
		{title && <h2>{title}</h2>}
		{children}
	</section>
)
