var raytraceFS = `
struct Ray {
	vec3 pos;
	vec3 dir;
};

struct Material {
	vec3  k_d;
	vec3  k_s;
	float n;
};

struct Sphere {
	vec3     center;
	float    radius;
	Material mtl;
};

struct Light {
	vec3 position;
	vec3 intensity;
};

struct HitInfo {
	float    t;
	vec3     position;
	vec3     normal;
	Material mtl;
};

uniform Sphere spheres[ NUM_SPHERES ];
uniform Light  lights [ NUM_LIGHTS  ];
uniform samplerCube envMap;
uniform int bounceLimit;

const float T_MIN = 0.01;

bool IntersectRay( inout HitInfo hit, Ray ray ) {
	hit.t = 1e30;
	bool foundHit = false;
	vec3 D = normalize(ray.dir);

	for ( int i=0; i<NUM_SPHERES; ++i ) {
		vec3 L = ray.pos - spheres[i].center;
		float a = dot(D, D);
		float b = 2.0 * dot(L, D);
		float c = dot(L, L) - spheres[i].radius * spheres[i].radius;
		float discriminant = b * b - 4.0 * a * c;

		if (discriminant < 0.0) continue;

		float sqrt_disc = sqrt(discriminant);
		float t0 = (-b - sqrt_disc) / (2.0 * a);
		float t1 = (-b + sqrt_disc) / (2.0 * a);

		float t_hit = hit.t;
		if (t0 > T_MIN && t0 < t_hit) {
			t_hit = t0;
		}
		if (t1 > T_MIN && t1 < t_hit) {
			t_hit = t1;
		}

		if (t_hit < hit.t) {
			hit.t = t_hit;
			hit.position = ray.pos + D * t_hit;
			hit.normal = normalize(hit.position - spheres[i].center);
			hit.mtl = spheres[i].mtl;
			foundHit = true;
		}
	}
	return foundHit;
}

vec3 Shade( Material mtl, vec3 position, vec3 normal, vec3 view ) {
	vec3 color = vec3(0.0);
	for ( int i = 0; i < NUM_LIGHTS; ++i ) {
		vec3 light_dir_unnormalized = lights[i].position - position;
		float light_dist = length(light_dir_unnormalized);
		vec3 L = normalize(light_dir_unnormalized);

		Ray shadowRay;
		shadowRay.pos = position + normal * T_MIN;
		shadowRay.dir = L;

		HitInfo shadowHit;
		bool occluder_found = IntersectRay(shadowHit, shadowRay);
		bool in_shadow = false;
		if (occluder_found && shadowHit.t < light_dist) {
			in_shadow = true;
		}

		if (!in_shadow) {
			float cos_theta = max(dot(normal, L), 0.0);
			color += mtl.k_d * lights[i].intensity * cos_theta;

			if (cos_theta > 0.0) {
				vec3 H = normalize(L + view);
				float cos_phi = max(dot(normal, H), 0.0);
				if (cos_phi > 0.0) {
					color += mtl.k_s * lights[i].intensity * pow(cos_phi, mtl.n);
				}
			}
		}
	}
	return color;
}

vec4 RayTracer( Ray ray ) {
	HitInfo hit;
	ray.dir = normalize(ray.dir);

	if (IntersectRay(hit, ray)) {
		vec3 view = normalize(-ray.dir);
		vec3 clr = Shade(hit.mtl, hit.position, hit.normal, view);
		vec3 k_s = hit.mtl.k_s;

		for (int bounce = 0; bounce < MAX_BOUNCES; ++bounce) {
			if (bounce >= bounceLimit) break;
			if (k_s.r + k_s.g + k_s.b <= 0.0) break;

			Ray r;
			HitInfo h;
			r.pos = hit.position + hit.normal * T_MIN;
			r.dir = reflect(-view, hit.normal);

			if (IntersectRay(h, r)) {
				vec3 reflected_view = normalize(-r.dir);
				clr += k_s * Shade(h.mtl, h.position, h.normal, reflected_view);
				hit = h;
				view = reflected_view;
				k_s *= h.mtl.k_s;
			} else {
				vec3 env = textureCube(envMap, r.dir.xzy).rgb;
				clr += k_s * env;
				break;
			}
		}
		return vec4(clr, 1.0);
	} else {
		return vec4(textureCube(envMap, ray.dir.xzy).rgb, 1.0);
	}
}
`;
