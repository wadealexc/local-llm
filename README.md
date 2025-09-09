
## ollama

https://github.com/ollama/ollama

### Install docker image

https://hub.docker.com/r/ollama/ollama

```sh
# CPU only
sudo docker run -d -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama
```

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

### Helpful commands - Docker

```sh
# Manually start container (after reboot)
sudo docker start ollama

# List running containers
sudo docker ps

# List all images on the system
sudo docker ps -a
```

### Helpful commands - Ollama

```sh
# List downloaded models
sudo docker exec -it ollama ollama list

# List currently-loaded models
sudo docker exec -it ollama ollama ps

# Stop a currently-loaded model
sudo docker exec -it ollama ollama stop smollm
```