import { Icon } from '../atoms/icon';

interface Breadcrumb {
  label: string;
  href?: string;
}

interface EntityBreadcrumbsProps {
  breadcrumbs: Breadcrumb[];
}

export function EntityBreadcrumbs({ breadcrumbs }: EntityBreadcrumbsProps) {
  if (!breadcrumbs || breadcrumbs.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb">
      <ol style={{ display: 'flex', gap: '8px', margin: 0, padding: 0, listStyle: 'none' }}>
        {breadcrumbs.map((crumb, index) => (
          <li key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {index > 0 && (
              <Icon name="forward" size="sm" aria-hidden="true" />
            )}
            {crumb.href ? (
              <a 
                href={crumb.href}
                style={{ 
                  textDecoration: 'none', 
                  color: 'inherit',
                  fontSize: '14px',
                }}
              >
                {crumb.label}
              </a>
            ) : (
              <span style={{ fontSize: '14px', fontWeight: '500' }}>
                {crumb.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}