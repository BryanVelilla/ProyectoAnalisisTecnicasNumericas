export interface NavItem {
  id: string;
  label: string;
  route: string;
  iconName: string;
  badge?: string;
  badgeVariant?: 'default' | 'success' | 'warning' | 'error';
  disabled?: boolean;
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
  collapsible?: boolean;
}
