export function toOwnerVisibleApplication(application) {
  if (!application) return application
  return application.status === 'Approved'
    ? { ...application, status: 'Pending Review' }
    : application
}

export function toOwnerVisibleApplications(applications = []) {
  return applications.map(toOwnerVisibleApplication)
}
