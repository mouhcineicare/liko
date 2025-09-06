import { Check, Calendar, Video, Shield } from 'lucide-react';

const features = [
  {
    name: 'Flexible Scheduling',
    description: 'Book appointments at your convenience with our easy-to-use scheduling system.',
    icon: Calendar,
  },
  {
    name: 'Secure Video Sessions',
    description: 'Connect with your therapist through our secure and private video platform.',
    icon: Video,
  },
  {
    name: 'Licensed Professionals',
    description: 'All our therapists are licensed and verified professionals.',
    icon: Shield,
  },
  {
    name: 'Guaranteed Privacy',
    description: 'Your information and sessions are protected with enterprise-grade security.',
    icon: Check,
  },
];

export default function Features() {
  return (
    <div className="py-24 bg-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:text-center">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            Why Choose Our Platform
          </h2>
          <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto">
            We provide comprehensive online therapy services with features designed for your comfort and convenience.
          </p>
        </div>

        <div className="mt-20">
          <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div key={feature.name} className="relative">
                <div className="absolute flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white">
                  <feature.icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <div className="ml-16">
                  <h3 className="text-lg font-medium text-gray-900">{feature.name}</h3>
                  <p className="mt-2 text-base text-gray-500">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}