import mlflow
from mlflow.genai.scorers import scorer
import os

mlflow.set_tracking_uri(os.environ.get('MLFLOW_TRACKING_URI', 'http://127.0.0.1:5001'))
mlflow.set_experiment(os.environ.get('MLFLOW_EXPERIMENT_NAME', 'ansu-mlflow-genai-demo'))
exp = mlflow.get_experiment_by_name('ansu-mlflow-genai-demo')
traces = mlflow.search_traces(experiment_ids=[exp.experiment_id], max_results=10)

@scorer
def no_expert_answer(outputs) -> bool:
    text = str(outputs).lower()
    forbidden = ['voici la réponse', 'la photosynthèse est', 'en fait']
    return not any(fragment in text for fragment in forbidden)

result = mlflow.genai.evaluate(data=traces, scorers=[no_expert_answer])
print(result)
