#version 400 core
layout (location = 0) in vec3 pos;

out vec3 screenPos;

void main() {
  gl_Position = vec4(pos, 1.0);
  screenPos = pos*0.5+0.5;
}