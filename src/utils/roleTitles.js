// Display titles for portal roles. Role names stay unchanged in the data and in permission checks;
// only the text shown to people uses these titles.
export const ROLE_TITLES = {
  Admin: 'ایڈمن',
  Evaluation: 'ایوالیوایشن',
  'SB User': 'شریعہ ممبر',
  'Certificate Manager': 'سرٹیفکیٹ منیجر',
  Client: 'کلائنٹ',
  Administrator: 'Administrator',
};

export function roleTitle(role) {
  return ROLE_TITLES[role] || role || '';
}
