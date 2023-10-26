#version 400 core
out vec4 fragColor;
in vec3 screenPos;

uniform int columns, rows;

vec3 interpolation_c2(vec3 x) {
  return x * x * x * (x * (x * 6.0 - 15.0) + 10.0);
}

float saturate(float value) {
  return clamp(value, 0, 1);
}

float set_range(float value, float low, float high) {
  return saturate((value - low)/(high - low));
}

void perlinHash(vec3 gridcell, float s,
          out vec4 lowzHash0,
          out vec4 lowzHash1,
          out vec4 lowzHash2,
          out vec4 highzHash0,
          out vec4 highzHash1,
          out vec4 highzHash2) {
  const vec2 OFFSET = vec2(50.0, 161.0);
  const float DOMAIN = 69.0;
  const vec3 SOMELARGEFLOATS = vec3(635.298681, 682.357502, 668.926525);
  const vec3 ZINC = vec3(48.500388, 65.294118, 63.934599);

  gridcell.xyz = gridcell.xyz - floor(gridcell.xyz * (1.0 / DOMAIN)) * DOMAIN;
  float d = DOMAIN - 1.5;
  vec3 gridcellInc1 = step(gridcell, vec3(d, d, d)) * (gridcell + 1.0);

  gridcellInc1 = mod(gridcellInc1, s);

  vec4 P = vec4(gridcell.xy, gridcellInc1.xy) + OFFSET.xyxy;
  P *= P;
  P = P.xzxz * P.yyww;
  vec3 lowzMod = vec3(1.0/(SOMELARGEFLOATS.xyz + gridcell.zzz * ZINC.xyz));
  vec3 highzMod = vec3(1.0/(SOMELARGEFLOATS.xyz + gridcellInc1.zzz * ZINC.xyz));
  lowzHash0 = fract(P * lowzMod.xxxx);
	highzHash0 = fract(P * highzMod.xxxx);
	lowzHash1 = fract(P * lowzMod.yyyy);
	highzHash1 = fract(P * highzMod.yyyy);
	lowzHash2 = fract(P * lowzMod.zzzz);
	highzHash2 = fract(P * highzMod.zzzz);
}

float perlin(vec3 P, float s) {
  P *= s;

  vec3 Pi = floor(P);
  vec3 Pi2 = floor(P);
  vec3 Pf = P - Pi;
  vec3 Pf_min1 = Pf - 1.0;

  vec4 hashx0, hashy0, hashz0, hashx1, hashy1, hashz1;
  perlinHash(Pi2, s, hashx0, hashy0, hashz0, hashx1, hashy1, hashz1);

  vec4 gradx0 = hashx0 - 0.49999;
  vec4 grady0 = hashy0 - 0.49999;
  vec4 gradz0 = hashz0 - 0.49999;
  vec4 gradx1 = hashx1 - 0.49999;
  vec4 grady1 = hashy1 - 0.49999;
  vec4 gradz1 = hashz1 - 0.49999;
  vec4 gradResults0 = inversesqrt(gradx0 * gradx0 + grady0 * grady0 + gradz0 * gradz0) * (vec2(Pf.x, Pf_min1.x).xyxy * gradx0 + vec2(Pf.y, Pf_min1.y).xxyy * grady0 + Pf.zzzz * gradz0);
  vec4 gradResults1 = inversesqrt(gradx1 * gradx1 + grady1 * grady1 + gradz1 * gradz1) * (vec2(Pf.x, Pf_min1.x).xyxy * gradx1 + vec2(Pf.y, Pf_min1.y).xxyy * grady1 + Pf_min1.zzzz * gradz1);

  vec3 blend = interpolation_c2(Pf);
  vec4 res0 = mix(gradResults0, gradResults1, blend.z);
  vec4 blend2 = vec4(blend.xy, vec2(1.0 - blend.xy));
  float final = dot(res0, blend2.zxzx * blend2.wwyy);
  final *= inversesqrt(0.75);
  return ((final * 1.5) + 1.0) * 0.5;
}

float getPerlin7Octaves(vec3 p, float s) {
  vec3 xyz = p;
  float f = 1.0;
  float a = 1.0;

  float perlinValue = 0.0;
  perlinValue += a * perlin(xyz, s * f); a *= 0.5; f *= 2.0;
  perlinValue += a * perlin(xyz, s * f); a *= 0.5; f *= 2.0;
  perlinValue += a * perlin(xyz, s * f); a *= 0.5; f *= 2.0;
  perlinValue += a * perlin(xyz, s * f); a *= 0.5; f *= 2.0;
  perlinValue += a * perlin(xyz, s * f); a *= 0.5; f *= 2.0;
  perlinValue += a * perlin(xyz, s * f); a *= 0.5; f *= 2.0;
  perlinValue += a * perlin(xyz, s * f);

  return perlinValue;
}

vec3 voronoiHash(vec3 x, float s) {
  x = mod(x, s);
  x = vec3(dot(x, vec3(127.1,311.7, 74.7)),
           dot(x, vec3(269.5,183.3,246.1)),
           dot(x, vec3(113.5,271.9,124.6)));

  return fract(sin(x) * 43758.5453123);
}

vec3 voronoi(vec3 x, float s, bool inverted) {
  x *= s;
  x += 0.5;
  vec3 p = floor(x);
  vec3 f = fract(x);

  float id = 0.0;
  vec2 res = vec2(1.0, 1.0);
  for (int k = -1; k <= 1; ++k) {
    for (int j = -1; j <= 1; ++j) {
      for (int i = -1; i <= 1; ++i) {
        vec3 b = vec3(i, j, k);
        vec3 r = vec3(b) - f + voronoiHash(p + b, s);
        float d = dot(r, r);

        if (d < res.x) {
          id = dot(p + b, vec3(1.0, 57.0, 113.0));
          res = vec2(d, res.x);
        }
        else if (d < res.y) {
          res.y = d;
        }
      }
    }
  }

  vec2 result = res;
  id = abs(id);

  if (inverted)
    return vec3(1.0 - result, id);
  else
    return vec3(result, id);
}

float getWorley3Octaves(vec3 p, float s) {
  vec3 xyz = p;

  float worleyValue1 = voronoi(xyz, 1.0 * s, true).r;
  float worleyValue2 = voronoi(xyz, 2.0 * s, false).r;
  float worleyValue3 = voronoi(xyz, 4.0 * s, false).r;

  worleyValue1 = saturate(worleyValue1);
  worleyValue2 = saturate(worleyValue2);
  worleyValue3 = saturate(worleyValue3);

  float worleyValue = worleyValue1;
  worleyValue -= worleyValue2 * 0.3;
  worleyValue -= worleyValue3 * 0.3;

  return worleyValue;
}

float dilatePerlinWorley(float p, float w, float x) {
  float curve = 0.75;
  if (x < 0.5) {
    x *= 2;
    float n = p + w * x;
    return n * mix(1.0, 0.5, pow(x, curve));
  }
  else {
    x = (x-0.5)/0.5;
    float n = w + p * (1.0 - x);
    return n * mix(0.5, 1.0, pow(x, 1.0/curve));
  }
}

void main() {
  vec2 colRow = vec2(columns, rows);
  vec2 screen = screenPos.xy;
  vec2 tiles = floor(screen*colRow)/colRow;
  float tileCount = float(columns*rows);
  float columnValue = columns/tileCount;

  float xvalue = tiles.x * columnValue;
  float yvalue = tiles.y;
  float value = xvalue + yvalue;

  vec3 pos = vec3(fract(screenPos.xy*colRow), value);

  float perl = getPerlin7Octaves(pos, 4.0);
  perl = set_range(perl, 0.3, 1.4);

  float worl = getWorley3Octaves(pos, 6.0);
  worl = set_range(worl, -0.3, 1.3);

  float worleyPerlin = dilatePerlinWorley(perl, worl, 0.3);

  fragColor = vec4(vec3(worleyPerlin), 1);
}