{{- define "streamflix.labels" -}}
app.kubernetes.io/part-of: streamflix
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version | replace "+" "_" }}
{{- end }}

{{/* Image reference. Call with (dict "root" $ "name" "auth-service"). */}}
{{- define "streamflix.image" -}}
{{- $g := .root.Values.global -}}
{{- $repo := printf "%s/%s" $g.imageRepositoryPrefix .name -}}
{{- if $g.imageRegistry -}}
{{ printf "%s/%s:%s" $g.imageRegistry $repo (toString $g.imageTag) }}
{{- else -}}
{{ printf "%s:%s" $repo (toString $g.imageTag) }}
{{- end -}}
{{- end }}

{{- define "streamflix.secretName" -}}
{{ .Values.secrets.existingSecret | default "streamflix-secrets" }}
{{- end }}

{{- define "streamflix.dbHost" -}}
{{- if .Values.postgresql.enabled -}}
postgres
{{- else -}}
{{ required "externalDatabase.host is required when postgresql.enabled=false" .Values.externalDatabase.host }}
{{- end -}}
{{- end }}

{{- define "streamflix.redisUrl" -}}
{{- if .Values.redis.enabled -}}
redis://redis:6379
{{- else -}}
{{ .Values.redis.externalUrl }}
{{- end -}}
{{- end }}

{{- define "streamflix.containerSecurity" -}}
allowPrivilegeEscalation: false
readOnlyRootFilesystem: true
capabilities:
  drop: [ALL]
{{- end }}
