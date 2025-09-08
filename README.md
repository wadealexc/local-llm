
## ollama

https://github.com/ollama/ollama

### Run ollama service

https://hub.docker.com/r/ollama/ollama

`sudo docker run -d -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama`

### Download a model

https://ollama.com/library?sort=popular

`sudo docker exec -it ollama ollama run smollm:latest`

### Query it from JS

```js
import ollama from 'ollama'

const message = { role: 'user', content: 'Why is the sky blue?' }
const response = await ollama.chat({
    model: 'smollm',
    messages: [message],
    stream: true,
})

for await (const part of response) {
    process.stdout.write(part.message.content)
}
```