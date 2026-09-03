import json
import math
import joblib
from sklearn.tree import DecisionTreeClassifier

# Ruta al dataset
with open("datasets/anomalias_empresa.json") as f:
    data = json.load(f)

X, y = [], []
for row in data:
    valor = row["valor"]
    # Ignorar NaN o valores nulos
    if valor is None or (isinstance(valor, float) and math.isnan(valor)):
        continue
    X.append([valor])  # usamos solo temperatura como feature
    y.append(row["es_anomalia"])

# Entrenar modelo simple
model = DecisionTreeClassifier(max_depth=3)
model.fit(X, y)

# Guardar modelo entrenado
empresa_id = data[0]["empresa_id"]
joblib.dump(model, f"models/anomalias_empresa_{empresa_id}.pkl")
print(f"Modelo entrenado y guardado en models/anomalias_empresa_{empresa_id}.pkl")
