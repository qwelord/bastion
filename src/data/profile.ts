export function readProfile() {
  try {
    return (localStorage.getItem('bastion.profile.name') || 'Гость').slice(0, 40);
  } catch {
    return 'Гость';
  }
}
export function saveProfile(name: string) {
  localStorage.setItem('bastion.profile.name', name.trim().slice(0, 40) || 'Гость');
  window.dispatchEvent(new Event('bastion:profile'));
}
