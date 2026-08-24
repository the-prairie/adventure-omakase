# Infrastructure boundary

The canonical plan targets:

- Cloud Run for the Fastify API and Adventure Compiler
- EAS Build, internal distribution, Submit and runtime-compatible Update for mobile
- preview, staging and production environments
- manual production promotion
- provider kill switches and city/cohort feature flags
- reviewed database migrations before application rollout

Add environment and monitoring configuration here only through a mapped vertical slice. Do not commit credentials or fabricate production project identifiers.
