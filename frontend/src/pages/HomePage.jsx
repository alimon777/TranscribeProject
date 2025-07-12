import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  Clock,
  Settings,
  FolderKanban,
  Brain,
  FileEdit,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  const navigate = useNavigate();
  const homeCardsData = [
    {
      title: 'Upload & Process',
      Icon: UploadCloud,
      description:
        'Upload files and provide context for intelligent processing.',
      buttonText: 'Start Processing',
      link: '/upload',
      buttonVariant: 'default',
    },
    {
      title: 'Pending Reviews',
      Icon: Clock,
      description:
        'Review transcriptions awaiting approval or in progress.',
      buttonText: 'View Pending Reviews',
      link: '/pending-reviews',
      buttonVariant: 'outline',
    },
    {
      title: 'Transcription Repository',
      Icon: FolderKanban,
      description:
        'Browse, organize, and search all stored transcriptions.',
      buttonText: 'Browse Repository',
      link: '/repository',
      buttonVariant: 'outline',
    },
    {
      title: 'Admin Dashboard',
      Icon: Settings,
      description:
        'Manage disputed content and resolve integration conflicts.',
      buttonText: 'Admin Interface',
      link: '/admin',
      buttonVariant: 'outline',
    },
  ];

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="text-center mb-10 md:mb-12">
        <h1 className="text-3xl sm:text-4xl md:text-[42px] font-bold mb-3 text-foreground">
          Intelligent Audio/Video Content Processor
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
          Transform your audio and video content into structured, searchable
          knowledge with AI-powered processing and intelligent integration.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {homeCardsData.map(
          ({
            title,
            Icon,
            description,
            buttonText,
            link,
            buttonVariant,
          }) => (
            <Card
              key={title}
              className="hover:shadow-lg transition-shadow duration-300 flex flex-col text-center"
            >
              <CardHeader className="items-center pb-2 pt-6">
                <div className="flex justify-center w-full">
                  <Icon className="h-10 w-10 mb-4 text-primary" />
                </div>
                <CardTitle className="text-md font-semibold">
                  {title}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-grow">
                <CardDescription className="text-xs">
                  {description}
                </CardDescription>
              </CardContent>
              <CardFooter>
                <Button
                  variant={buttonVariant}
                  size="sm"
                  className="w-full cursor-pointer"
                  onClick={() => navigate(link)}
                >
                  {buttonText}
                </Button>
              </CardFooter>
            </Card>
          )
        )}
      </div>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              {
                Icon: UploadCloud,
                title: 'Upload Content',
                desc: 'Upload audio/video files with context and metadata',
              },
              {
                Icon: Brain,
                title: 'AI Processing',
                desc: 'AI cleans transcription and generates supplementary materials',
              },
              {
                Icon: FileEdit,
                title: 'Review & Edit',
                desc: 'Review and make final edits to generated content',
              },
              {
                Icon: FolderKanban,
                title: 'Integration',
                desc: 'Intelligently integrate into existing knowledge base',
              },
            ].map(({ Icon, title, desc }, index) => (
              <div key={index} className="flex flex-col items-center">
                <div className="bg-primary/10 text-primary rounded-full p-3 mb-3">
                  <Icon className="h-7 w-7" />
                </div>
                <h3 className="font-semibold text-md mb-1">
                  {index + 1}. {title}
                </h3>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};