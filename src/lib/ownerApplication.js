export function toOwnerVisibleApplication(application) {
  return application
}

export function toOwnerVisibleApplications(applications = []) {
  return applications.map(toOwnerVisibleApplication)
}
