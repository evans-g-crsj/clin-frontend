#!/bin/sh

cat > /usr/share/nginx/html/config.js <<- EndOfConf
window.env = {
    REACT_APP_PATIENT_SERVICE_URL: "$PATIENT_SERVICE_URL",
    REACT_APP_VARIANT_SERVICE_URL: "$VARIANT_SERVICE_URL",
    REACT_APP_GENE_SERVICE_URL: "$GENE_SERVICE_URL",
    REACT_APP_META_SERVICE_URL: "$META_SERVICE_URL",
    REACT_APP_FHIR_SERVICE_URL: "$FHIR_SERVICE_URL",
    REACT_APP_HPO_SERVICE_URL: "$HPO_SERVICE_URL",
    REACT_APP_KEYCLOAK_CONFIG: "$KEYCLOAK_CONFIG",
    REACT_APP_ARRANGER_API: "$ARRANGER_API",
    REACT_APP_ZEPLIN_URL: "$ZEPLIN_URL",
    REACT_APP_FHIR_CONSOLE_URL: "$FHIR_CONSOLE_URL",
    REACT_APP_ARRANGER_PROJECT_ID: "$ARRANGER_PROJECT_ID"
}
EndOfConf

exec "$@"